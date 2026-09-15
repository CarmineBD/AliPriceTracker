import type { RequestHandler } from 'express';

import { aliExpressProductIdSchema } from '@alitracker/shared';

import { lookupAliExpressProduct } from './aliexpress-product-lookup.service';

export const getProduct: RequestHandler = async (request, response) => {
  const productId = aliExpressProductIdSchema.parse(request.params.productId);
  const result = await lookupAliExpressProduct(productId);

  response.status(result.status).json(result.body);
};
