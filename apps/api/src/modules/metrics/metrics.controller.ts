import type { RequestHandler } from 'express';

import { profitHistoryQuerySchema } from '@alitracker/shared';

import { getMetrics, getProfitHistory as getProfitHistoryData } from './metrics.service.js';

export const get: RequestHandler = async (_request, response) => {
  response.status(200).json(await getMetrics());
};

export const getProfitHistory: RequestHandler = async (request, response) => {
  const { period, month } = profitHistoryQuerySchema.parse(request.query);
  response.status(200).json(await getProfitHistoryData(period, { month }));
};
