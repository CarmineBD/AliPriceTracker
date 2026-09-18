import type { RequestHandler } from 'express';

import { opportunitiesListQuerySchema } from '@alitracker/shared';

import { listOpportunities } from './opportunities.service.js';

export const listOpportunitiesController: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(await listOpportunities(opportunitiesListQuerySchema.parse(request.query)));
};
