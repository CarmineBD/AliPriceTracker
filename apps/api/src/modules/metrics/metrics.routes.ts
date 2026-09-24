import { Router } from 'express';

import { get, getProfitHistory } from './metrics.controller.js';

export const metricsRouter = Router();

metricsRouter.get('/profit-history', getProfitHistory);
metricsRouter.get('/', get);
