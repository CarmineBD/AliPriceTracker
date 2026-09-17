import { z } from 'zod';

const optionalDescription = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().nullable().optional(),
);

const requiredShortName = z.string().trim().min(1, 'El nombre corto es obligatorio.').max(80);

const optionalMoneyAmount = z.preprocess(
  (value) => (value === '' ? null : value),
  z
    .number()
    .finite()
    .nonnegative()
    .max(9_999_999_999.99)
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000_001,
      'El precio puede tener como máximo dos decimales.',
    )
    .nullable()
    .optional(),
);

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(160),
  shortName: requiredShortName,
  description: optionalDescription,
  averageSellingPrice: optionalMoneyAmount,
});

export const productUpdateSchema = productCreateSchema
  .partial()
  .refine((values) => Object.keys(values).length > 0, 'Debe enviarse al menos un campo.');

export const productIdSchema = z.string().uuid();

export const productsListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export const productImageContentTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const productImageContentTypeSchema = z.enum(productImageContentTypes);
export const productImageMaxBytes = 5 * 1024 * 1024;

export type ProductImageContentType = z.infer<typeof productImageContentTypeSchema>;

export const productOfferSchema = z.object({
  id: z.string().uuid(),
  sellerName: z.string().nullable(),
  sellerLocation: z.string().nullable(),
  sellerReviewScore: z.string().nullable(),
  sellerSalesCount: z.number().int().nullable(),
  // PostgreSQL numeric is deliberately kept as a string to avoid losing monetary precision.
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .nullable(),
  currency: z.string().length(3).nullable(),
  quantityAvailable: z.number().int(),
  maxPurchase: z.number().int(),
  url: z.string().url(),
});

export const productResponseSchema = z.object({
  id: productIdSchema,
  name: z.string(),
  shortName: z.string(),
  imageKey: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  description: z.string().nullable(),
  averageSellingPrice: z.number().finite().nonnegative().nullable(),
  offersCount: z.number().int().nonnegative(),
  offers: z.array(productOfferSchema),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const productsListResponseSchema = z.object({
  products: z.array(productResponseSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type Product = z.infer<typeof productResponseSchema>;
export type ProductOffer = z.infer<typeof productOfferSchema>;
export type ProductsListQuery = z.infer<typeof productsListQuerySchema>;
export type ProductsList = z.infer<typeof productsListResponseSchema>;

export const productOptionSchema = z.object({
  id: productIdSchema,
  name: z.string(),
  shortName: z.string(),
});

export const productOptionsResponseSchema = z.array(productOptionSchema);

export type ProductOption = z.infer<typeof productOptionSchema>;

export const publicationProductReassignSchema = z.object({
  productId: productIdSchema,
});

export type PublicationProductReassignInput = z.infer<typeof publicationProductReassignSchema>;

export const aliExpressProductIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'El ID de la publicación debe contener solo números.')
  .max(100);

export const aliExpressProductVariantSchema = z.object({
  aliexpressSkuId: z.string(),
  id: z.string(),
  variantName: z.string().nullable(),
  price: z.string().nullable(),
  priceAmount: z.number().finite().nonnegative().nullable(),
  currency: z.string().length(3).nullable(),
  quantityAvailable: z.number().int().nonnegative().nullable(),
  maxPurchase: z.number().int().nonnegative().nullable(),
  imageUrl: z.string().url().nullable(),
  salable: z.boolean(),
  productId: productIdSchema.nullable(),
  isImported: z.boolean(),
});

export const aliExpressStoreSchema = z.object({
  aliexpressStoreId: z.string().nullable(),
  name: z.string().nullable(),
  location: z.string().nullable(),
  reviewScore: z.number().finite().nullable(),
  sales180d: z.string().nullable(),
});

export const aliExpressPublicationSchema = z.object({
  aliexpressProductId: aliExpressProductIdSchema,
  name: z.string().nullable(),
  url: z.string().url().nullable(),
  salesCount: z.string().nullable(),
  reviewScore: z.number().finite().nullable(),
  reviewCount: z.number().int().nonnegative().nullable(),
});

export const aliExpressProductLookupResponseSchema = z.object({
  store: aliExpressStoreSchema,
  publication: aliExpressPublicationSchema,
  productId: aliExpressProductIdSchema,
  productName: z.string().nullable(),
  products: z.array(aliExpressProductVariantSchema),
});

export type AliExpressProductLookup = z.infer<typeof aliExpressProductLookupResponseSchema>;
export type AliExpressProductVariant = z.infer<typeof aliExpressProductVariantSchema>;
export type AliExpressStore = z.infer<typeof aliExpressStoreSchema>;
export type AliExpressPublication = z.infer<typeof aliExpressPublicationSchema>;

const aliexpressDatabaseIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'El identificador de AliExpress debe contener solo números.')
  .max(19)
  .refine(
    (value) => /^\d+$/.test(value) && BigInt(value) <= 9_223_372_036_854_775_807n,
    'El identificador es demasiado grande.',
  );

const nullableImportText = (maximumLength: number) =>
  z.string().trim().max(maximumLength).nullable();

const nullableCurrencyCode = z
  .string()
  .trim()
  .regex(/^[a-zA-Z]{3}$/, 'La moneda debe ser un código ISO de tres letras.')
  .transform((value) => value.toUpperCase())
  .nullable();

const nullableMoneyAmount = z
  .number()
  .finite()
  .nonnegative()
  .max(9_999_999_999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000_001,
    'El precio puede tener como máximo dos decimales.',
  )
  .nullable();

export const aliExpressPublicationImportSchema = z.object({
  store: z.object({
    aliexpressStoreId: aliexpressDatabaseIdSchema,
    name: nullableImportText(160),
    location: nullableImportText(100),
    reviewScore: z.number().finite().nonnegative().nullable(),
    sales180d: nullableImportText(32),
  }),
  publication: z.object({
    aliexpressProductId: aliexpressDatabaseIdSchema,
    name: nullableImportText(500),
    url: z.string().trim().url('La URL de la publicación debe ser válida.').nullable(),
    salesCount: nullableImportText(32),
    reviewScore: z.number().finite().nonnegative().nullable(),
    reviewCount: z.number().int().nonnegative().nullable(),
  }),
  products: z
    .array(
      z.object({
        aliexpressSkuId: z
          .string()
          .trim()
          .regex(/^\d+$/, 'El SKU de AliExpress debe contener solo números.')
          .max(32),
        productId: productIdSchema,
        price: nullableMoneyAmount,
        currency: nullableCurrencyCode,
        quantityAvailable: z.number().int().nonnegative().nullable(),
        maxPurchase: z.number().int().nonnegative().nullable(),
      }),
    )
    .min(1, 'Debe asociarse al menos un SKU a un producto interno.'),
});

export type AliExpressPublicationImportInput = z.infer<typeof aliExpressPublicationImportSchema>;

export const storeIdSchema = z.string().uuid();

export const storeResponseSchema = z.object({
  id: storeIdSchema,
  aliexpressStoreId: z.string(),
  name: z.string().nullable(),
  location: z.string().nullable(),
  reviewScore: z.number().finite().nullable(),
  sales180d: z.string().nullable(),
  publicationsCount: z.number().int().nonnegative(),
});

export const storesListResponseSchema = z.array(storeResponseSchema);

export type Store = z.infer<typeof storeResponseSchema>;

export const publicationProductDetailSchema = z.object({
  id: z.string().uuid(),
  productId: productIdSchema,
  productName: z.string(),
  productShortName: z.string(),
  aliexpressSkuId: z.string(),
  price: z.string().nullable(),
  currency: z.string().length(3).nullable(),
  quantityAvailable: z.number().int().nonnegative().nullable(),
  maxPurchase: z.number().int().nonnegative().nullable(),
});

export const storePublicationDetailSchema = z.object({
  id: z.string().uuid(),
  aliexpressProductId: z.string(),
  name: z.string().nullable(),
  url: z.string().url().nullable(),
  salesCount: z.string().nullable(),
  reviewScore: z.number().finite().nullable(),
  reviewCount: z.number().int().nonnegative().nullable(),
  products: z.array(publicationProductDetailSchema),
});

export const storeDetailResponseSchema = storeResponseSchema.extend({
  publications: z.array(storePublicationDetailSchema),
});

export type StoreDetail = z.infer<typeof storeDetailResponseSchema>;

const publicationProductHistoryPriceSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .nullable();

export const publicationProductHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  price: publicationProductHistoryPriceSchema,
  currency: z.string().length(3).nullable(),
  quantityAvailable: z.number().int().nonnegative().nullable(),
  capturedAt: z.string().datetime({ offset: true }),
});

export const publicationProductHistoryResponseSchema = z.object({
  publicationProduct: z.object({
    id: z.string().uuid(),
    publicationId: z.string().uuid(),
    productId: productIdSchema,
    aliexpressSkuId: z.string(),
    current: z.object({
      price: publicationProductHistoryPriceSchema,
      currency: z.string().length(3).nullable(),
      quantityAvailable: z.number().int().nonnegative().nullable(),
    }),
    lastCheckedAt: z.string().datetime({ offset: true }).nullable(),
  }),
  baseline: publicationProductHistoryEntrySchema.nullable(),
  history: z.array(publicationProductHistoryEntrySchema),
});

export type PublicationProductHistoryEntry = z.infer<typeof publicationProductHistoryEntrySchema>;
export type PublicationProductHistoryResponse = z.infer<
  typeof publicationProductHistoryResponseSchema
>;

export const productBestOfferHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  isAvailable: z.boolean(),
  publicationProductId: z.string().uuid().nullable(),
  price: publicationProductHistoryPriceSchema,
  currency: z.string().length(3).nullable(),
  quantityAvailable: z.number().int().nonnegative().nullable(),
  publicationUrl: z.string().url().nullable(),
  capturedAt: z.string().datetime({ offset: true }),
});

export const productBestOfferHistoryResponseSchema = z.object({
  product: z.object({ id: productIdSchema, name: z.string() }),
  current: productBestOfferHistoryEntrySchema.nullable(),
  baseline: productBestOfferHistoryEntrySchema.nullable(),
  history: z.array(productBestOfferHistoryEntrySchema),
});

export type ProductBestOfferHistoryEntry = z.infer<typeof productBestOfferHistoryEntrySchema>;
export type ProductBestOfferHistoryResponse = z.infer<typeof productBestOfferHistoryResponseSchema>;
