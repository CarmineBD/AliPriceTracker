import {
  productCreateSchema,
  productComboCreateSchema,
  productComboListResponseSchema,
  productComboResponseSchema,
  productComboUpdateSchema,
  productImageContentTypeSchema,
  productResponseSchema,
  productUpdateSchema,
  type Product,
  type ProductCombo,
  type ProductComboCreateInput,
  type ProductComboUpdateInput,
  type ProductCreateInput,
  type ProductsList,
  type ProductsListQuery,
  type ProductUpdateInput,
  type ProductOption,
  productsListResponseSchema,
  productOptionsResponseSchema,
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

export async function getProductOptions(): Promise<ProductOption[]> {
  return productOptionsResponseSchema.parse(await request<unknown>('/api/products/options'));
}

export async function getProduct(id: string): Promise<Product> {
  return productResponseSchema.parse(await request<unknown>(`/api/products/${id}`));
}

export async function getProductComponents(id: string): Promise<ProductCombo[]> {
  return productComboListResponseSchema.parse(
    await request<unknown>(`/api/products/${id}/components`),
  );
}

export async function addProductComponent(
  productId: string,
  input: ProductComboCreateInput,
): Promise<ProductCombo> {
  const body = productComboCreateSchema.parse(input);
  return productComboResponseSchema.parse(
    await request<unknown>(`/api/products/${productId}/components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function updateProductComponent(
  productId: string,
  containsProductId: string,
  input: ProductComboUpdateInput,
): Promise<ProductCombo> {
  const body = productComboUpdateSchema.parse(input);
  return productComboResponseSchema.parse(
    await request<unknown>(`/api/products/${productId}/components/${containsProductId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteProductComponent(
  productId: string,
  containsProductId: string,
): Promise<void> {
  await request<void>(`/api/products/${productId}/components/${containsProductId}`, {
    method: 'DELETE',
  });
}

export async function replaceProductComponents(
  productId: string,
  desiredComponents: ProductCombo[],
): Promise<void> {
  const existingComponents = await getProductComponents(productId);
  const desiredById = new Map(
    desiredComponents.map((component) => [component.containsProductId, component]),
  );

  await Promise.all(
    existingComponents
      .filter((component) => !desiredById.has(component.containsProductId))
      .map((component) => deleteProductComponent(productId, component.containsProductId)),
  );

  await Promise.all(
    desiredComponents.map(async (component) => {
      const existing = existingComponents.find(
        (current) => current.containsProductId === component.containsProductId,
      );
      if (!existing) {
        await addProductComponent(productId, {
          containsProductId: component.containsProductId,
          quantity: component.quantity,
        });
        return;
      }
      if (existing.quantity !== component.quantity) {
        await updateProductComponent(productId, component.containsProductId, {
          quantity: component.quantity,
        });
      }
    }),
  );
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
