import type { RequestHandler } from 'express';

import {
  bestCouponCombinationsListQuerySchema,
  opportunitiesListQuerySchema,
} from '@alitracker/shared';

import { listBestCouponCombinations, listOpportunities } from './opportunities.service.js';

export const listOpportunitiesController: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(await listOpportunities(opportunitiesListQuerySchema.parse(request.query)));
};

export const listBestCouponCombinationsController: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(
      await listBestCouponCombinations(bestCouponCombinationsListQuerySchema.parse(request.query)),
    );
};
