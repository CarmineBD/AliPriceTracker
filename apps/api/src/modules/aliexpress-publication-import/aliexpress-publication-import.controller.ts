import type { RequestHandler } from 'express';

import { aliExpressPublicationImportSchema } from '@alitracker/shared';

import { HttpError } from '../../utils/http-error';
import { importAliExpressPublication } from './aliexpress-publication-import.service';

export const create: RequestHandler = async (request, response) => {
  const input = aliExpressPublicationImportSchema.safeParse(request.body);
  if (!input.success) {
    throw new HttpError('La petición de importación no es válida.', 400, 'INVALID_REQUEST', {
      details: input.error.flatten(),
    });
  }

  response.status(201).json(await importAliExpressPublication(input.data));
};
