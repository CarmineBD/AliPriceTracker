import { Router } from 'express';

import {
  create,
  createProduct,
  getById,
  getProductById,
  list,
  listProducts,
  remove,
  removeProduct,
  update,
  updateProduct,
} from './sellers.controller';

export const sellersRouter = Router();
export const sellerProductsRouter = Router();

sellersRouter.get('/', list);
sellersRouter.get('/:id', getById);
sellersRouter.post('/', create);
sellersRouter.patch('/:id', update);
sellersRouter.delete('/:id', remove);

sellerProductsRouter.get('/', listProducts);
sellerProductsRouter.get('/:id', getProductById);
sellerProductsRouter.post('/', createProduct);
sellerProductsRouter.patch('/:id', updateProduct);
sellerProductsRouter.delete('/:id', removeProduct);
