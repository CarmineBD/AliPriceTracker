import { Router } from 'express';

import { remove, update } from './publication-products.controller.js';

export const publicationProductsRouter = Router();

publicationProductsRouter.patch('/:publicationProductId', update);
publicationProductsRouter.delete('/:publicationProductId', remove);
