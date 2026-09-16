import type { AliExpressProductLookup } from '@alitracker/shared';

import { env } from '../../config/env';
import {
  aliexpressClient,
  type AliExpressProductResult,
} from '../aliexpress-client/aliexpress-client';
import { AliExpressProductLookupRepository } from './aliexpress-product-lookup.repository';

type ProductRequest = (productId: string) => Promise<AliExpressProductResult>;

type ProductLookupResult =
  { status: 200; body: AliExpressProductLookup } | { status: 502 | 503; body: { error: string } };

type ProductLookupRepository = Pick<AliExpressProductLookupRepository, 'findImportedSkuIds'>;

export async function lookupAliExpressProduct(
  productId: string,
  requestProduct: ProductRequest = (requestedProductId) =>
    aliexpressClient.getProduct(requestedProductId),
  repository: ProductLookupRepository = new AliExpressProductLookupRepository(),
): Promise<ProductLookupResult> {
  // The previous implementation could only reach AliExpress through the protected debug service.
  // Keep its configuration precondition in this refactor so the endpoint's behaviour does not change.
  if (!env.DEBUG_API_KEY) {
    return {
      status: 502,
      body: { error: 'No se pudo consultar la publicación de AliExpress.' },
    };
  }

  const result = await requestProduct(productId);

  if (result.status !== 200 || !result.body.success) {
    return {
      status: result.status === 503 ? 503 : 502,
      body: { error: 'No se pudo consultar la publicación de AliExpress.' },
    };
  }

  if (!result.body.store || !result.body.publication) {
    return {
      status: 502,
      body: { error: 'No se pudo procesar la publicaciÃ³n de AliExpress.' },
    };
  }

  const importedSkuIds = await repository.findImportedSkuIds(
    result.body.publication.aliexpressProductId,
    result.body.products.map((product) => product.aliexpressSkuId),
  );

  return {
    status: 200,
    body: {
      store: result.body.store,
      publication: result.body.publication,
      // These aliases keep the existing, unmodified search UI working during phase 1.
      productId: result.body.publication.aliexpressProductId,
      productName: result.body.publication.name,
      products: result.body.products.map((product) => ({
        ...product,
        id: product.aliexpressSkuId,
        productId: importedSkuIds.get(product.aliexpressSkuId) ?? null,
        isImported: importedSkuIds.has(product.aliexpressSkuId),
      })),
    },
  };
}
