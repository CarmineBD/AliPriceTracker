import type { RequestHandler } from 'express';

import { getMetrics } from './metrics.service.js';

export const get: RequestHandler = async (_request, response) => {
  response.status(200).json(await getMetrics());
};
