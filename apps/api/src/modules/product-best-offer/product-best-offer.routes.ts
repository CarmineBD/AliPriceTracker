import { Router } from 'express';

import { getHistory } from './product-best-offer.controller.js';

export const productBestOfferRouter = Router();

productBestOfferRouter.get('/:productId/best-offer-history', getHistory);
