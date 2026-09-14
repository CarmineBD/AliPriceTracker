import { Router } from 'express';

import { create, getById, list, remove, update } from './products.controller';

export const productsRouter = Router();

productsRouter.get('/', list);
productsRouter.get('/:id', getById);
productsRouter.post('/', create);
productsRouter.patch('/:id', update);
productsRouter.delete('/:id', remove);
