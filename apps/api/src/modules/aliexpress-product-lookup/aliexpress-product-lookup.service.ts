import type { AliExpressProductLookup } from '@alitracker/shared';

import { env } from '../../config/env';
import { debugAliExpressProduct } from '../aliexpress-debug/aliexpress-debug.service';

type DebugProductRequest = typeof debugAliExpressProduct;

type ProductLookupResult =
  { status: 200; body: AliExpressProductLookup } | { status: 502 | 503; body: { error: string } };

export async function lookupAliExpressProduct(
  productId: string,
  requestProduct: DebugProductRequest = debugAliExpressProduct,
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

  return {
    status: 200,
    body: {
      productId: result.body.productId,
      productName: result.body.productName,
      products: result.body.skuPrices.map((sku) => ({
        id: sku.skuId,
        variantName: sku.variantName,
        price: sku.price,
        quantityAvailable: sku.stock,
        imageUrl: sku.image,
        salable: sku.salable,
      })),
    },
  };
}
