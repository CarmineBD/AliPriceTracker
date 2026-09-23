import type { RequestHandler } from 'express';

import { listAveragePrices } from './average-prices.service.js';

export const list: RequestHandler = async (_request, response) => {
  response.status(200).json(await listAveragePrices());
};
