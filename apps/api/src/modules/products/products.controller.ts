import type { RequestHandler } from 'express';

import { productCreateSchema, productIdSchema, productUpdateSchema } from '@alitracker/shared';

import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from './products.service';

const parseId = (value: unknown) => productIdSchema.parse(value);

export const list: RequestHandler = async (_request, response) => {
  response.status(200).json(await listProducts());
};

export const getById: RequestHandler = async (request, response) => {
  response.status(200).json(await getProduct(parseId(request.params.id)));
};

export const create: RequestHandler = async (request, response) => {
  response.status(201).json(await createProduct(productCreateSchema.parse(request.body)));
};

export const update: RequestHandler = async (request, response) => {
  const id = parseId(request.params.id);
  response.status(200).json(await updateProduct(id, productUpdateSchema.parse(request.body)));
};

export const remove: RequestHandler = async (request, response) => {
  await deleteProduct(parseId(request.params.id));
  response.status(204).send();
};
