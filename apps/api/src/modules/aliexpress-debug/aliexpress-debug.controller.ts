import type { RequestHandler } from 'express';
import { z } from 'zod';

import { debugAliExpressProduct, logAliExpressDebug } from './aliexpress-debug.service';

const productIdSchema = z.string().regex(/^\d+$/, 'productId must contain only digits.');

export const getProduct: RequestHandler = async (request, response) => {
  const requestProductId = request.params.productId ?? null;
  logAliExpressDebug('aliexpress_debug_request_started', { productId: requestProductId });
  const productId = productIdSchema.safeParse(request.params.productId);

  if (!productId.success) {
    logAliExpressDebug('aliexpress_debug_error', {
      productId: requestProductId,
      errorType: 'validation',
    });
    response.status(400).json({
      success: false,
      mtopRet: null,
      productId: requestProductId,
      productName: null,
      skuCount: 0,
      skuPrices: [],
      errorType: 'validation',
      upstreamStatus: null,
    });
    return;
  }

  const result = await debugAliExpressProduct({
    productId: productId.data,
    debugApiKey: request.header('x-debug-api-key'),
  });

  response.status(result.status).json(result.body);
};
