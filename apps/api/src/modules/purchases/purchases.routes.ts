import { Router } from 'express';

import { create, list, remove, update } from './purchases.controller.js';

export const purchasesRouter = Router();

purchasesRouter.get('/', list);
purchasesRouter.post('/', create);
purchasesRouter.patch('/:id', update);
purchasesRouter.delete('/:id', remove);
