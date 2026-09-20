import { Router } from 'express';

import {
  listBestCouponCombinationsController,
  listOpportunitiesController,
} from './opportunities.controller.js';

export const opportunitiesRouter = Router();

opportunitiesRouter.get('/best-by-coupon', listBestCouponCombinationsController);
opportunitiesRouter.get('/', listOpportunitiesController);
