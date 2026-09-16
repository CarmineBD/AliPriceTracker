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

  const products = preview.products.flatMap((product) => {
    const productId = Object.hasOwn(associations, product.aliexpressSkuId)
      ? associations[product.aliexpressSkuId]
      : product.productId ?? undefined;
    if (!productId) {
      return [];
    }

    return [{
      aliexpressSkuId: product.aliexpressSkuId,
      productId,
      price: product.priceAmount,
      currency: product.currency,
      quantityAvailable: product.quantityAvailable,
      maxPurchase: product.maxPurchase,
    }];
  });

  if (products.length === 0) {
    throw new Error('Debes asociar al menos una variante a un producto interno antes de continuar.');
  }

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
