import type { RequestHandler } from 'express';

import { publicationProductChangesListQuerySchema } from '@alitracker/shared';

import { listPublicationProductChanges } from './publication-product-changes.service.js';

export const listPublicationProductChangesController: RequestHandler = async (
  request,
  response,
) => {
  response
    .status(200)
    .json(
      await listPublicationProductChanges(
        publicationProductChangesListQuerySchema.parse(request.query),
      ),
    );
};
