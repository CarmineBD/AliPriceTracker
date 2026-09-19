import { Router } from 'express';

import { listPublicationProductChangesController } from './publication-product-changes.controller.js';

export const publicationProductChangesRouter = Router();

publicationProductChangesRouter.get('/', listPublicationProductChangesController);
