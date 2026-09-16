import { Router } from 'express';

import { getById, list } from './stores.controller';

export const storesRouter = Router();

storesRouter.get('/', list);
storesRouter.get('/:id', getById);
