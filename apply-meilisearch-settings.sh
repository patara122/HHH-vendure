#!/usr/bin/env sh
set -e

MEILI_HOST=http://meilisearch.hhh.co.th:7700
MEILI_API_KEY=XPEjd5jifeINvSuJ7jSyZt22o6Goqzj29nAWX7lnfn0

if [ -z "$MEILI_API_KEY" ]; then
  echo "MEILI_API_KEY not set; falling back to key from config."
  MEILI_API_KEY=XPEjd5jifeINvSuJ7jSyZt22o6Goqzj29nAWX7lnfn0
fi

SEARCHABLE_ATTRIBUTES='["description","productName","productVariantName","sku","slug","variant-NewSKU","variant-SupplierSKU","variant-Barcode","variant-facetValueNames","variant-facetValueCodes","product-facetValueNames","product-facetValueCodes"]'

INDEXES="vendure-variants vendure-products"

for idx in $INDEXES; do
  echo "Updating searchableAttributes for index: $idx"
  curl -sS -X PATCH "${MEILI_HOST}/indexes/${idx}/settings" \
    -H "Authorization: Bearer ${MEILI_API_KEY}" \
    -H "Content-Type: application/json" \
    --data-raw "{\"searchableAttributes\": ${SEARCHABLE_ATTRIBUTES}}" || echo "Failed to update $idx"
done

echo "Done."
