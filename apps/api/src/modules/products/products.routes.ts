import express, { Router } from 'express';

import { productImageContentTypes, productImageMaxBytes } from '@alitracker/shared';

import {
  addComponent,
  create,
  getById,
  list,
  listComponents,
  listOptions,
  remove,
  removeComponent,
  update,
  updateComponent,
  uploadImage,
} from './products.controller';

export const productsRouter = Router();

productsRouter.get('/', list);
productsRouter.get('/options', listOptions);
productsRouter.get('/:id/components', listComponents);
productsRouter.post('/:id/components', addComponent);
productsRouter.patch('/:id/components/:containsProductId', updateComponent);
productsRouter.delete('/:id/components/:containsProductId', removeComponent);
productsRouter.get('/:id', getById);
productsRouter.post('/', create);
productsRouter.patch('/:id', update);
productsRouter.put(
  '/:id/image',
  express.raw({ type: [...productImageContentTypes], limit: productImageMaxBytes }),
  uploadImage,
);
productsRouter.delete('/:id', remove);
