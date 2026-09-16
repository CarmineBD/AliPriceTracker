import { Router } from 'express';

import { create } from './aliexpress-publication-import.controller';

export const aliExpressPublicationImportRouter = Router();

aliExpressPublicationImportRouter.post('/', create);
