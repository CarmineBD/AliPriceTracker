import type { AliExpressProductLookup } from '@alitracker/shared';

import { env } from '../../config/env';
import { debugAliExpressProduct } from '../aliexpress-debug/aliexpress-debug.service';
import { AliExpressProductLookupRepository } from './aliexpress-product-lookup.repository';

type DebugProductRequest = typeof debugAliExpressProduct;

type ProductLookupResult =
  { status: 200; body: AliExpressProductLookup } | { status: 502 | 503; body: { error: string } };

type ProductLookupRepository = Pick<AliExpressProductLookupRepository, 'findImportedSkuIds'>;

export async function lookupAliExpressProduct(
  productId: string,
  requestProduct: DebugProductRequest = debugAliExpressProduct,
  repository: ProductLookupRepository = new AliExpressProductLookupRepository(),
): Promise<ProductLookupResult> {
  const result = await requestProduct({
    productId,
    debugApiKey: env.DEBUG_API_KEY,
  });

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
