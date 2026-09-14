import {
  productCreateSchema,
  productResponseSchema,
  productUpdateSchema,
  type Product,
  type ProductCreateInput,
  type ProductUpdateInput,
} from '@alitracker/shared';
import { z } from 'zod';

import { request } from './client';

const productsResponseSchema = z.array(productResponseSchema);

const jsonRequest = (method: 'POST' | 'PATCH', body: ProductCreateInput | ProductUpdateInput) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function getProducts(): Promise<Product[]> {
  return productsResponseSchema.parse(await request<unknown>('/api/products'));
}

export async function createProduct(input: ProductCreateInput): Promise<Product> {
  const body = productCreateSchema.parse(input);
  return productResponseSchema.parse(
    await request<unknown>('/api/products', jsonRequest('POST', body)),
  );
}

export async function updateProduct(id: string, input: ProductUpdateInput): Promise<Product> {
  const body = productUpdateSchema.parse(input);
  return productResponseSchema.parse(
    await request<unknown>(`/api/products/${id}`, jsonRequest('PATCH', body)),
  );
}

export async function deleteProduct(id: string): Promise<void> {
  await request<void>(`/api/products/${id}`, { method: 'DELETE' });
}
