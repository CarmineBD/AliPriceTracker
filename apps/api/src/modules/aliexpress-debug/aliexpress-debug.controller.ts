import type { RequestHandler } from 'express';
import { z } from 'zod';

import {
  debugAliExpressProduct,
  hasMatchingDebugApiKey,
  logAliExpressDebug,
} from './aliexpress-debug.service';
import { aliexpressClient } from '../aliexpress-client/aliexpress-client';

const productIdSchema = z.string().regex(/^\d+$/, 'productId must contain only digits.');
const productQuerySchema = z.object({
  includeRaw: z.enum(['true']).optional(),
});

export const getProduct: RequestHandler = async (request, response) => {
  const requestProductId = request.params.productId ?? null;
  logAliExpressDebug('aliexpress_debug_request_started', {});
  const productId = productIdSchema.safeParse(request.params.productId);

  if (!productId.success) {
    logAliExpressDebug('aliexpress_debug_error', {
      mtopCode: 'VALIDATION_ERROR',
    });
    response.status(400).json({
      success: false,
      mtopRet: null,
      productId: requestProductId,
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
    });
    return;
  }

  const result = await debugAliExpressProduct({
    productId: productId.data,
    debugApiKey: request.header('x-debug-api-key'),
    includeRaw: productQuerySchema.parse(request.query).includeRaw === 'true',
  });

  response.status(result.status).json(result.body);
};

export const reseedSession: RequestHandler = async (request, response) => {
  if (!hasMatchingDebugApiKey(request.header('x-debug-api-key'))) {
    logAliExpressDebug('aliexpress_debug_error', { mtopCode: 'VALIDATION_ERROR' });
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const session = await aliexpressClient.reseedSession();
    logAliExpressDebug('aliexpress_debug_session_reseeded', { cookieCount: session.cookieCount });
    response.status(200).json({
      success: true,
      session: {
        source: 'reseed',
        ...session,
      },
    });
  } catch {
    logAliExpressDebug('aliexpress_debug_error', { mtopCode: 'RESEED_ERROR' });
    response.status(503).json({ error: 'AliExpress session reseed is unavailable.' });
  }
};
