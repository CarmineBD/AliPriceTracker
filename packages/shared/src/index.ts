import { z } from 'zod';

const optionalText = (maximumLength: number) =>
  z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().trim().max(maximumLength).nullable().optional(),
  );

const optionalDescription = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().nullable().optional(),
);

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(160),
  shortName: optionalText(80),
  description: optionalDescription,
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
  quantityAvailable: z.number().int(),
  maxPurchase: z.number().int(),
  url: z.string().url(),
});

export const productResponseSchema = z.object({
  id: productIdSchema,
  name: z.string(),
  shortName: z.string().nullable(),
  imageKey: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  description: z.string().nullable(),
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

export const aliExpressProductIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'El ID de la publicación debe contener solo números.')
  .max(100);

export const aliExpressProductVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.string().nullable(),
  quantityAvailable: z.number().int().nonnegative(),
  imageUrl: z.string().url().nullable(),
  salable: z.boolean(),
});

export const aliExpressProductLookupResponseSchema = z.object({
  productId: aliExpressProductIdSchema,
  productName: z.string().nullable(),
  products: z.array(aliExpressProductVariantSchema),
});

export type AliExpressProductLookup = z.infer<typeof aliExpressProductLookupResponseSchema>;
export type AliExpressProductVariant = z.infer<typeof aliExpressProductVariantSchema>;

const optionalNonNegativeNumber = z.preprocess(
  (value) => (value === '' ? null : value),
  z.coerce.number().finite().nonnegative().nullable().optional(),
);

const optionalNonNegativeCount = z.preprocess(
  (value) => (value === '' ? null : value),
  z
    .union([
      z.number().int().safe().nonnegative().transform(String),
      z
        .string()
        .regex(/^\d+$/, 'Debe ser un entero no negativo.')
        .refine((value) => Number.isSafeInteger(Number(value)), 'El valor es demasiado grande.')
        .transform((value) => String(Number(value))),
    ])
    .nullable()
    .optional(),
);

export const sellerCreateSchema = z.object({
  name: optionalText(160),
  location: optionalText(100),
  reviewScore: optionalNonNegativeNumber,
  salesCount: optionalNonNegativeCount,
});

export const sellerUpdateSchema = sellerCreateSchema
  .partial()
  .refine((values) => Object.keys(values).length > 0, 'Debe enviarse al menos un campo.');

export const sellerIdSchema = z.string().uuid();

export const sellersListQuerySchema = productsListQuerySchema;

export const sellerResponseSchema = z.object({
  id: sellerIdSchema,
  name: z.string().nullable(),
  location: z.string().nullable(),
  reviewScore: z.string().nullable(),
  salesCount: z.number().int().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const sellersListResponseSchema = z.object({
  sellers: z.array(sellerResponseSchema),
  pagination: productsListResponseSchema.shape.pagination,
});

export const sellerProductCreateSchema = z.object({
  sellerId: sellerIdSchema,
  productId: productIdSchema,
  quantityAvailable: z.coerce.number().int().nonnegative(),
  maxPurchase: z.coerce.number().int().positive(),
  url: z.string().trim().url('Debe ser una URL válida.'),
  aliexpressItemId: z.string().trim().min(1).max(100),
});

export const sellerProductUpdateSchema = sellerProductCreateSchema
  .partial()
  .refine((values) => Object.keys(values).length > 0, 'Debe enviarse al menos un campo.');

export const sellerProductIdSchema = z.string().uuid();

export const sellerProductsListQuerySchema = productsListQuerySchema.extend({
  sellerId: sellerIdSchema.optional(),
  productId: productIdSchema.optional(),
});

export const sellerProductResponseSchema = z.object({
  id: sellerProductIdSchema,
  sellerId: sellerIdSchema,
  productId: productIdSchema,
  quantityAvailable: z.number().int(),
  maxPurchase: z.number().int(),
  url: z.string().url(),
  aliexpressItemId: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const sellerProductsListResponseSchema = z.object({
  sellerProducts: z.array(sellerProductResponseSchema),
  pagination: productsListResponseSchema.shape.pagination,
});

export type SellerCreateInput = z.infer<typeof sellerCreateSchema>;
export type SellerUpdateInput = z.infer<typeof sellerUpdateSchema>;
export type Seller = z.infer<typeof sellerResponseSchema>;
export type SellersListQuery = z.infer<typeof sellersListQuerySchema>;
export type SellersList = z.infer<typeof sellersListResponseSchema>;
export type SellerProductCreateInput = z.infer<typeof sellerProductCreateSchema>;
export type SellerProductUpdateInput = z.infer<typeof sellerProductUpdateSchema>;
export type SellerProduct = z.infer<typeof sellerProductResponseSchema>;
export type SellerProductsListQuery = z.infer<typeof sellerProductsListQuerySchema>;
export type SellerProductsList = z.infer<typeof sellerProductsListResponseSchema>;
