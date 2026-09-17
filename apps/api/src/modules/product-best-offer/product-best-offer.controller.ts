import type { RequestHandler } from 'express';
import { z } from 'zod';

import { productIdSchema } from '@alitracker/shared';

import { getProductBestOfferHistory } from './product-best-offer.service.js';

const historyQuerySchema = z
  .object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'from no puede ser posterior a to.',
      });
    }
  });

export const getHistory: RequestHandler = async (request, response) => {
  const productId = productIdSchema.parse(request.params.productId);
  const query = historyQuerySchema.parse(request.query);
  response.status(200).json(
    await getProductBestOfferHistory(productId, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    }),
  );
};
