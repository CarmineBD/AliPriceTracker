import {
  aliExpressPublicationImportSchema,
  type AliExpressProductLookup,
  type AliExpressPublicationImportInput,
} from '@alitracker/shared';

import { request } from './client';

export type ImportAliExpressPublicationPayload = AliExpressPublicationImportInput;

export function buildImportAliExpressPublicationPayload(
  preview: AliExpressProductLookup,
  associations: Record<string, string | undefined>,
): ImportAliExpressPublicationPayload {
  if (!preview.store.aliexpressStoreId) {
    throw new Error('La respuesta de AliExpress no incluye el identificador de la tienda.');
  }

  const products = preview.products.map((product) => {
    const productId = associations[product.aliexpressSkuId];
    if (!productId) {
      throw new Error('Debes asociar un producto a todas las variantes antes de continuar.');
    }

    return {
      aliexpressSkuId: product.aliexpressSkuId,
      productId,
      quantityAvailable: product.quantityAvailable,
      maxPurchase: product.maxPurchase,
    };
  });

  return aliExpressPublicationImportSchema.parse({
    store: preview.store,
    publication: preview.publication,
    products,
  });
}

export type ImportAliExpressPublicationResponse = {
  success: true;
  message: string;
  store: {
    id: string;
    aliexpressStoreId: string;
    created: boolean;
  };
  publication: {
    id: string;
    aliexpressProductId: string;
  };
  publicationProducts: Array<{
    id: string;
    aliexpressSkuId: string;
    productId: string;
  }>;
};

export async function importAliExpressPublication(
  input: ImportAliExpressPublicationPayload,
): Promise<ImportAliExpressPublicationResponse> {
  const body = aliExpressPublicationImportSchema.parse(input);

  return request<ImportAliExpressPublicationResponse>('/api/aliexpress/publications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
