import type { RequestHandler } from 'express';

import { storeIdSchema } from '@alitracker/shared';

import { getStore, listStores } from './stores.service';

export const list: RequestHandler = async (_request, response) => {
  response.status(200).json(await listStores());
};

export const getById: RequestHandler = async (request, response) => {
  const id = storeIdSchema.parse(request.params.id);
  response.status(200).json(await getStore(id));
};
