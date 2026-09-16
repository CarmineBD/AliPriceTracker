import { createHash, timingSafeEqual } from 'node:crypto';

import { env } from '../../config/env';
import {
  AliExpressClient,
  aliexpressClient,
  type AliExpressClientDependencies,
  type AliExpressProductResponse,
  type AliExpressProductResult,
} from '../aliexpress-client/aliexpress-client';

type DebugResult = AliExpressProductResult | { status: 401; body: AliExpressProductResponse };

type DebugProductDependencies = AliExpressClientDependencies & {
  aliexpressClient?: Pick<AliExpressClient, 'getProduct'>;
};

export function logAliExpressDebug(event: string, fields: Record<string, unknown>) {
  console.info(JSON.stringify({ event, ...fields }));
}

export function hasMatchingDebugApiKey(providedKey: string | undefined): boolean {
  if (!providedKey || !env.DEBUG_API_KEY) {
    return false;
  }

  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(providedKey), digest(env.DEBUG_API_KEY));
}

function createValidationResponse(productId: string): AliExpressProductResponse {
  return {
    success: false,
    mtopRet: null,
    productId,
    productName: null,
    skuCount: 0,
    skuPrices: [],
    store: null,
    publication: null,
    products: [],
    errorType: 'validation',
    errorCode: null,
    upstreamStatus: null,
    session: null,
  };
}

export async function debugAliExpressProduct(
  {
    productId,
    debugApiKey,
    includeRaw = false,
  }: {
    productId: string;
    debugApiKey: string | undefined;
    includeRaw?: boolean;
  },
  dependencies: DebugProductDependencies = {},
): Promise<DebugResult> {
  if (!hasMatchingDebugApiKey(debugApiKey)) {
    logAliExpressDebug('aliexpress_debug_error', { mtopCode: 'VALIDATION_ERROR' });
    return { status: 401, body: createValidationResponse(productId) };
  }

  const client =
    dependencies.aliexpressClient ??
    (dependencies.sessionRunner || dependencies.httpClient
      ? new AliExpressClient(dependencies)
      : aliexpressClient);
  const result = await client.getProduct(productId, { includeRaw });
  const mtopCode = result.body.mtopRet?.[0]?.split('::', 1)[0] ?? 'UPSTREAM_ERROR';

  logAliExpressDebug(
    result.status === 200 ? 'aliexpress_debug_mtop_ret' : 'aliexpress_debug_error',
    {
      mtopCode,
      retriedAfterTokenRefresh: result.body.session?.retriedAfterTokenRefresh ?? false,
    },
  );

  return result;
}
