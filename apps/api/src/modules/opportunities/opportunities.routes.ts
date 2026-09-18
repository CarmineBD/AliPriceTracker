import { Router } from 'express';

import { listOpportunitiesController } from './opportunities.controller.js';

export const opportunitiesRouter = Router();

opportunitiesRouter.get('/', listOpportunitiesController);
