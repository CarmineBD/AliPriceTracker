import { Router } from 'express';

import { create, list, remove, update } from './sales.controller.js';

export const salesRouter = Router();

salesRouter.get('/', list);
salesRouter.post('/', create);
salesRouter.patch('/:id', update);
salesRouter.delete('/:id', remove);
