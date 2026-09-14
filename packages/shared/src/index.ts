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
  iconUrl: optionalText(2_048),
  description: optionalDescription,
});

export const productUpdateSchema = productCreateSchema
  .partial()
  .refine((values) => Object.keys(values).length > 0, 'Debe enviarse al menos un campo.');

export const productIdSchema = z.string().uuid();

export const productResponseSchema = z.object({
  id: productIdSchema,
  name: z.string(),
  shortName: z.string().nullable(),
  iconUrl: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type Product = z.infer<typeof productResponseSchema>;
