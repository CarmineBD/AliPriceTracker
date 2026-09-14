import express, { Router } from 'express';

import { productImageContentTypes, productImageMaxBytes } from '@alitracker/shared';

import { create, getById, list, remove, update, uploadImage } from './products.controller';

export const productsRouter = Router();

productsRouter.get('/', list);
productsRouter.get('/:id', getById);
productsRouter.post('/', create);
productsRouter.patch('/:id', update);
productsRouter.put(
  '/:id/image',
  express.raw({ type: [...productImageContentTypes], limit: productImageMaxBytes }),
  uploadImage,
);
productsRouter.delete('/:id', remove);
