import { Router } from 'express';

import { get } from './metrics.controller.js';

export const metricsRouter = Router();

metricsRouter.get('/', get);
