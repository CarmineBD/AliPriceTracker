import {
  productCreateSchema,
  productImageContentTypeSchema,
  productResponseSchema,
  productUpdateSchema,
  type Product,
  type ProductCreateInput,
  type ProductsList,
  type ProductsListQuery,
  type ProductUpdateInput,
  productsListResponseSchema,
} from '@alitracker/shared';

import { request } from './client';

const jsonRequest = (method: 'POST' | 'PATCH', body: ProductCreateInput | ProductUpdateInput) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function getProducts({ page, pageSize }: ProductsListQuery): Promise<ProductsList> {
  const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return productsListResponseSchema.parse(
    await request<unknown>(`/api/products?${search.toString()}`),
  );
}

export async function getProduct(id: string): Promise<Product> {
  return productResponseSchema.parse(await request<unknown>(`/api/products/${id}`));
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

export async function uploadProductImage(id: string, image: File): Promise<Product> {
  const contentType = productImageContentTypeSchema.parse(image.type);

  return productResponseSchema.parse(
    await request<unknown>(`/api/products/${id}/image`, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: image,
    }),
  );
}

export async function deleteProduct(id: string): Promise<void> {
  await request<void>(`/api/products/${id}`, { method: 'DELETE' });
}
