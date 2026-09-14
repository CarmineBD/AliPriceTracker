import type { RequestHandler } from 'express';

import {
  productCreateSchema,
  productIdSchema,
  productImageContentTypeSchema,
  productUpdateSchema,
  productsListQuerySchema,
} from '@alitracker/shared';

import { HttpError } from '../../utils/http-error';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  uploadProductImage,
  updateProduct,
} from './products.service';

const parseId = (value: unknown) => productIdSchema.parse(value);

export const list: RequestHandler = async (request, response) => {
  response.status(200).json(await listProducts(productsListQuerySchema.parse(request.query)));
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

export const uploadImage: RequestHandler = async (request, response) => {
  const id = parseId(request.params.id);
  const contentType = productImageContentTypeSchema.parse(request.headers['content-type']);

  if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
    throw new HttpError('An image file is required.', 400);
  }

  response.status(200).json(
    await uploadProductImage(id, {
      buffer: request.body,
      contentType,
    }),
  );
};

export const remove: RequestHandler = async (request, response) => {
  await deleteProduct(parseId(request.params.id));
  response.status(204).send();
};
