import type { RequestHandler } from 'express';

import { listStock } from './stock.service.js';

export const list: RequestHandler = async (_request, response) => {
  response.status(200).json(await listStock());
};
