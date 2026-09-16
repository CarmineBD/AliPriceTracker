import type { RequestHandler } from 'express';
import { z } from 'zod';

import { productIdSchema } from '@alitracker/shared';

import { getPublicationProductHistory } from './publication-product-history.service';

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
  const publicationProductId = productIdSchema.parse(request.params.publicationProductId);
  const query = historyQuerySchema.parse(request.query);

  response.status(200).json(
    await getPublicationProductHistory(publicationProductId, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    }),
  );
};
