import { Router } from 'express';

import { getHistory } from './publication-product-history.controller';

export const publicationProductHistoryRouter = Router();

publicationProductHistoryRouter.get('/:publicationProductId/history', getHistory);
