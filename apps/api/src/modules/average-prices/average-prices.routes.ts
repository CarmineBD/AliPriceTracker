import { Router } from 'express';

import { list } from './average-prices.controller.js';

export const averagePricesRouter = Router();

averagePricesRouter.get('/', list);
