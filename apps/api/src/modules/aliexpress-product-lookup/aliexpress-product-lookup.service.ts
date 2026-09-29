import type { AliExpressProductLookup } from '@alitracker/shared';

import {
  aliexpressClient,
  type AliExpressProductResult,
} from '../aliexpress-client/aliexpress-client';
import { AliExpressProductLookupRepository } from './aliexpress-product-lookup.repository';

type ProductRequest = (productId: string) => Promise<AliExpressProductResult>;

type AliExpressLookupErrorCode =
  | 'ALIEXPRESS_SESSION_REAUTH_REQUIRED'
  | 'ALIEXPRESS_SESSION_UNAVAILABLE'
  | 'ALIEXPRESS_CONNECTION_FAILED'
  | 'ALIEXPRESS_UPSTREAM_UNAVAILABLE'
  | 'ALIEXPRESS_UPSTREAM_REJECTED'
  | 'ALIEXPRESS_RESPONSE_INCOMPLETE';

type ProductLookupError = {
  code: AliExpressLookupErrorCode;
  message: string;
};

type ProductLookupResult =
  | { status: 200; body: AliExpressProductLookup }
  | { status: 502 | 503; body: ProductLookupError };

type ProductLookupRepository = Pick<AliExpressProductLookupRepository, 'findImportedSkuIds'>;

const lookupErrorMessages: Record<AliExpressLookupErrorCode, string> = {
  ALIEXPRESS_SESSION_REAUTH_REQUIRED:
    'La sesión de AliExpress ha caducado o ha sido rechazada. Actualiza la cookie de AliExpress e inicializa de nuevo la sesión.',
  ALIEXPRESS_SESSION_UNAVAILABLE:
    'No se pudo acceder a la sesión guardada de AliExpress. Comprueba la configuración de la sesión en el servidor.',
  ALIEXPRESS_CONNECTION_FAILED:
    'No se pudo conectar con AliExpress. Comprueba la conexión del servidor e inténtalo de nuevo.',
  ALIEXPRESS_UPSTREAM_UNAVAILABLE:
    'AliExpress no está disponible en este momento. Inténtalo de nuevo más tarde.',
  ALIEXPRESS_UPSTREAM_REJECTED:
    'AliExpress ha rechazado la consulta de esta publicación. Inténtalo de nuevo más tarde.',
  ALIEXPRESS_RESPONSE_INCOMPLETE:
    'AliExpress ha devuelto información incompleta de la publicación. Inténtalo de nuevo más tarde.',
};

function createLookupError(
  status: 502 | 503,
  code: AliExpressLookupErrorCode,
): ProductLookupResult {
  return { status, body: { code, message: lookupErrorMessages[code] } };
}

function getLookupError(result: AliExpressProductResult): ProductLookupResult {
  const { body } = result;

  if (body.errorCode === 'ALIEXPRESS_SESSION_REAUTH_REQUIRED') {
    return createLookupError(503, 'ALIEXPRESS_SESSION_REAUTH_REQUIRED');
  }

  if (result.status === 503) {
    return createLookupError(503, 'ALIEXPRESS_SESSION_UNAVAILABLE');
  }

  if (body.upstreamStatus === null) {
    return createLookupError(502, 'ALIEXPRESS_CONNECTION_FAILED');
  }

  if (body.upstreamStatus >= 500) {
    return createLookupError(503, 'ALIEXPRESS_UPSTREAM_UNAVAILABLE');
  }

  return createLookupError(502, 'ALIEXPRESS_UPSTREAM_REJECTED');
}

export async function lookupAliExpressProduct(
  productId: string,
  requestProduct: ProductRequest = (requestedProductId) =>
    aliexpressClient.getProduct(requestedProductId),
  repository: ProductLookupRepository = new AliExpressProductLookupRepository(),
): Promise<ProductLookupResult> {
  const result = await requestProduct(productId);

  if (result.status !== 200 || !result.body.success) {
    return getLookupError(result);
  }

  if (!result.body.store || !result.body.publication) {
    return createLookupError(502, 'ALIEXPRESS_RESPONSE_INCOMPLETE');
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
