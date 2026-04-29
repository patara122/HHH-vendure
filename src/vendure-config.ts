import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
 //   DefaultSearchPlugin,
    VendureConfig,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin , configureS3AssetStorage} from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { CmsPlugin } from './plugins/cms/cms.plugin';
import {MeilisearchPlugin} from '@rahul_vendure/vendure-meilli-search';
import { LanguageCode } from '@vendure/common/lib/generated-types';

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',     
        trustProxy: IS_DEV ? false : 1,
        // The following options are useful in development mode,
        // but are best turned off for production for security
        // reasons.
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
        },
    },
    dbConnectionOptions: {
        type: 'postgres',
        // See the README.md "Migrations" section for an explanation of
        // the `synchronize` and `migrations` options.
        synchronize: true,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {

        Product : [
            {   name: 'MarketingBullets',
                type: 'localeString',
                ui: { component: 'rich-text-form-input' }, 
                nullable: true,
                label: [
                    { languageCode: LanguageCode.en, value: 'Marketing Bullets' },
                    { languageCode: LanguageCode.th, value: 'Marketing Bullets' },
                ],
            },
            {   name: 'CountryofOrigin',
                type: 'localeString',
                nullable: true,
                label: [
                    { languageCode: LanguageCode.en, value: 'Country of Origin' },
                    { languageCode: LanguageCode.th, value: 'Country of Origin' },
                ],
            },

            {
                name: 'Datasheet',
                type: 'struct',
                list: true,
                nullable: true,
                fields: [
                    {
                        name: 'url',
                        type: 'string',
                    },
                    {
                        name: 'filename',
                        type: 'string',
                    }
                ]
            },
               {
                name: 'ProductManual',
                type: 'struct',
                list: true,
                nullable: true,
                fields: [
                    {
                        name: 'url',
                        type: 'string',
                    },
                    {
                        name: 'filename',
                        type: 'string',
                    }
                ]
            },
                   {
                name: 'ProductVideo',
                type: 'struct',
                list: true,
                nullable: true,
                fields: [
                    {
                        name: 'url',
                        type: 'string',
                    },
                    {
                        name: 'filename',
                        type: 'string',
                    }
                ]
            },
            {
                name: 'CatalogPage',
                type: 'struct',
                list: true,
                nullable: true,
                fields: [
                    {
                        name: 'url',
                        type: 'string',
                    },
                    {
                        name: 'filename',
                        type: 'string',
                    }
                ]
            },

        ],

        ProductVariant : [
            
            {
                name: 'SupplierSKU',
                type: 'string',
                nullable: true,
            },

            {
                name: 'NewSKU',
                type: 'string',
                nullable: true,
            },
            
            {
                name: 'Barcode',
                type: 'string',
                pattern: '^[0-9]{12,13}$',
                nullable: true,
            },

            {   
                name: 'Packing',
                type: 'struct',
                nullable: true,
                fields: [
                    {
                        name: 'PackQTY',
                        type: 'string',
                    },
                    {
                        name: 'PackUnit',
                        type: 'string',
                    }  
                ]
            },
            {   
                name: 'Dimensions',
                type: 'struct',
                nullable: true,
                fields: [
                    {
                        name: 'Width',
                        type: 'string',
                    },
                    {
                        name: 'Depth',
                        type: 'string',
                    },
                    {
                        name: 'Height',
                        type: 'string',
                    },
                    {
                        name: 'Weight',
                        type: 'string',
                    }  
                ]
            },
            {   
                name: 'PkgDimensions',
                type: 'struct',
                fields: [
                    {
                        name: 'Width',
                        type: 'string',
                    },
                    {
                        name: 'Depth',
                        type: 'string',
                    },
                    {
                        name: 'Height',
                        type: 'string',
                    },
                    {
                        name: 'Weight',
                        type: 'string',
                    }  
                ]
            }
        ]

    },
    plugins: [

        MeilisearchPlugin.init({
            host: process.env.MEILI_HOST,
            apiKey: process.env.MEILI_API_KEY,
            hydrateProductRelations: ['facetValues', 'facetValues.translations'],
            hydrateProductVariantRelations: ['facetValues', 'facetValues.translations'],
            customProductMappings: {
                facetValueNames: {
                    graphQlType: 'String',
                    valueFn: async (product, variants, languageCode, injector) => {
                        const facetValues = (product as any).facetValues || [];
                        if (!facetValues.length) return '';
                        const { TransactionalConnection, FacetValue } = require('@vendure/core');
                        const { In } = require('typeorm');
                        const connection = injector.get(TransactionalConnection) as any;
                        const fvs = await connection.getRepository(FacetValue).find({
                            where: { id: In(facetValues.map((fv: any) => fv.id)) },
                            relations: ['translations']
                        });
                        return fvs.map((fv: any) => {
                            const t = fv.translations?.find((t: any) => t.languageCode === languageCode) || fv.translations?.[0];
                            return t?.name || fv.name || '';
                        }).join(' ');
                    },
                },
                facetValueCodes: {
                    graphQlType: 'String',
                    valueFn: (product, variants, languageCode, injector) => {
                        const facetValues = (product as any).facetValues || [];
                        return facetValues.map((fv: any) => fv.code).join(' ');
                    },
                },
            },
            customProductVariantMappings: {
                NewSKU: {
                    graphQlType: 'String',
                    valueFn: (variant, languageCode, injector, ctx) => {
                        return (variant.customFields as any)?.NewSKU ?? '';
                    },
                },
                SupplierSKU: {
                    graphQlType: 'String',
                    valueFn: (variant, languageCode, injector, ctx) => {
                        return (variant.customFields as any)?.SupplierSKU ?? '';
                    },
                },
                Barcode: {
                    graphQlType: 'String',
                    valueFn: (variant, languageCode, injector, ctx) => {
                        return (variant.customFields as any)?.Barcode ?? '';
                    },
                },
                facetValueNames: {
                    graphQlType: 'String',
                    valueFn: async (variant, languageCode, injector, ctx) => {
                        const facetValues = (variant as any).facetValues || [];
                        if (!facetValues.length) return '';
                        const { TransactionalConnection, FacetValue } = require('@vendure/core');
                        const { In } = require('typeorm');
                        const connection = injector.get(TransactionalConnection) as any;
                        const fvs = await connection.getRepository(FacetValue).find({
                            where: { id: In(facetValues.map((fv: any) => fv.id)) },
                            relations: ['translations']
                        });
                        return fvs.map((fv: any) => {
                            const t = fv.translations?.find((t: any) => t.languageCode === languageCode) || fv.translations?.[0];
                            return t?.name || fv.name || '';
                        }).join(' ');
                    },
                },
                facetValueCodes: {
                    graphQlType: 'String',
                    valueFn: (variant, languageCode, injector, ctx) => {
                        const facetValues = (variant as any).facetValues || [];
                        return facetValues.map((fv: any) => fv.code).join(' ');
                    },
                },
            },
            searchConfig: {
                attributesToSearchOn: ['productName', 'productVariantName','sku','description','slug','variant-NewSKU','variant-SupplierSKU','variant-Barcode','variant-facetValueNames','variant-facetValueCodes','product-facetValueNames','product-facetValueCodes'],
            },
        }),
    
        GraphiqlPlugin.init(),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // For local dev, the correct value for assetUrlPre
            // fix should
            // be guessed correctly, but for production it will usually need
            // to be set manually to match your production url.
            assetUrlPrefix: IS_DEV ? undefined : 'http://s3.hhh.co.th/vendure-assets/',
             storageStrategyFactory: process.env.S3_BUCKET
        ? configureS3AssetStorage({
            bucket: process.env.S3_BUCKET,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID!,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            },
            nativeS3Configuration: {
              // Platform-specific endpoint configuration
              endpoint: process.env.S3_ENDPOINT,
              region: process.env.S3_REGION,
              forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
              signatureVersion: 'v4',
            },
        })
        : undefined,
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
       // DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                // The following variables will change depending on your storefront implementation.
                // Here we are assuming a storefront running at http://localhost:8080.
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: 'http://localhost:8080/verify',
                passwordResetUrl: 'http://localhost:8080/password-reset',
                changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change'
            },
        }),
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: IS_DEV
                ? path.join(__dirname, '../dist/dashboard')
                : path.join(__dirname, 'dashboard'),
        }),
        CmsPlugin.init({}),
    ],
};
