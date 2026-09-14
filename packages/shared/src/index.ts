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

export const productImageContentTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const productImageContentTypeSchema = z.enum(productImageContentTypes);
export const productImageMaxBytes = 5 * 1024 * 1024;

export type ProductImageContentType = z.infer<typeof productImageContentTypeSchema>;

export const productResponseSchema = z.object({
  id: productIdSchema,
  name: z.string(),
  shortName: z.string().nullable(),
  imageKey: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  description: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type Product = z.infer<typeof productResponseSchema>;
