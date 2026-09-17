import type { RequestHandler } from 'express';

import { productIdSchema, publicationProductReassignSchema } from '@alitracker/shared';

import {
  deletePublicationProduct,
  reassignPublicationProduct,
} from './publication-products.service.js';

const parseId = (value: unknown) => productIdSchema.parse(value);

export const update: RequestHandler = async (request, response) => {
  const publicationProductId = parseId(request.params.publicationProductId);
  response
    .status(200)
    .json(
      await reassignPublicationProduct(
        publicationProductId,
        publicationProductReassignSchema.parse(request.body),
      ),
    );
};

export const remove: RequestHandler = async (request, response) => {
  await deletePublicationProduct(parseId(request.params.publicationProductId));
  response.status(204).send();
};
