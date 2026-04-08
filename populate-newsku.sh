#!/usr/bin/env sh
set -euo pipefail

# Loads .env if present
if [ -f .env ]; then
  set -a
  . .env
  set +a
fi

ADMIN_API=${ADMIN_API:-http://localhost:3000/admin-api}
USERNAME=${SUPERADMIN_USERNAME:-superadmin}
PASSWORD=${SUPERADMIN_PASSWORD:-superadmin}
BATCH=${BATCH:-50}

COOKIE_JAR=${COOKIE_JAR:-/tmp/vendure_cookies}
echo "Logging in to $ADMIN_API as $USERNAME (cookies -> $COOKIE_JAR)..."
login_payload=$(jq -n --arg u "$USERNAME" --arg p "$PASSWORD" '{query: "mutation Login($username:String!,$password:String!){ login(username:$username,password:$password){ ... on CurrentUser { id identifier channels { token code } } ... on InvalidCredentialsError { message } } }", variables: { username: $u, password: $p }}')
login_resp=$(echo "$login_payload" | curl -sS -c "$COOKIE_JAR" -X POST "$ADMIN_API" -H 'Content-Type: application/json' --data-binary @-)

ok=$(echo "$login_resp" | jq -r '.data.login.id // empty')
if [ -z "$ok" ]; then
  echo "Login failed. Response:" 
  echo "$login_resp" | jq .
  exit 1
fi

echo "Authenticated. Cookie saved to $COOKIE_JAR"

# Get total number of variants

total_resp=$(jq -n '{query:"query ($take:Int,$skip:Int){ productVariants(options:{take:$take,skip:$skip}){ totalItems } }", variables:{take:1, skip:0}}' | \
  curl -sS -b "$COOKIE_JAR" -X POST "$ADMIN_API" -H 'Content-Type: application/json' --data-binary @-)

total=$(echo "$total_resp" | jq -r '.data.productVariants.totalItems // 0')

if [ -z "$total" ]; then
  echo "Failed to read total product variants. Response:"; echo "$total_resp" | jq .; exit 1
fi

echo "Total product variants: $total"

skip=0
while [ "$skip" -lt "$total" ]; do
  echo "Fetching variants skip=$skip take=$BATCH"
  resp=$(jq -n --argjson skip "$skip" --argjson take "$BATCH" '{query:"query ($skip:Int,$take:Int){ productVariants(options:{skip:$skip,take:$take}){ items{ id sku customFields{ NewSKU } } } }", variables:{skip:$skip, take:$take}}' | \
    curl -sS -b "$COOKIE_JAR" -X POST "$ADMIN_API" -H 'Content-Type: application/json' --data-binary @-)

  updates_json=$(echo "$resp" | jq '[.data.productVariants.items[] | select((.customFields==null) or (.customFields.NewSKU == null) or (.customFields.NewSKU == "")) | {id: .id, customFields: { NewSKU: .sku }}]')
  n_updates=$(echo "$updates_json" | jq 'length')
  echo "Found $n_updates variants to update in this batch."

  if [ "$n_updates" -gt 0 ]; then
    update_payload=$(jq -n --argjson input "$updates_json" '{query:"mutation UpdateMany($input:[UpdateProductVariantInput!]!){ updateProductVariants(input:$input){ id sku customFields{ NewSKU } } }", variables:{input:$input}}')
    update_resp=$(echo "$update_payload" | curl -sS -b "$COOKIE_JAR" -X POST "$ADMIN_API" -H 'Content-Type: application/json' --data-binary @-)
    echo "Updated: $(echo "$update_resp" | jq -r '.data.updateProductVariants | length') items"
  fi

  skip=$((skip + BATCH))
done

echo "All done."
