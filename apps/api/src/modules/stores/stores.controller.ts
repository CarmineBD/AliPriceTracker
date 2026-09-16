import type { RequestHandler } from 'express';

import { listStores } from './stores.service';

export const list: RequestHandler = async (_request, response) => {
  response.status(200).json(await listStores());
};
