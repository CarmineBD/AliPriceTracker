import type { RequestHandler } from 'express';

import {
  productCreateSchema,
  productComboCreateSchema,
  productComboUpdateSchema,
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
  listProductOptions,
  listProducts,
  uploadProductImage,
  updateProduct,
} from './products.service';
import {
  addProductComponent,
  listProductComponents,
  removeProductComponent,
  updateProductComponent,
} from './product-combos.service';

const parseId = (value: unknown) => productIdSchema.parse(value);

export const list: RequestHandler = async (request, response) => {
  response.status(200).json(await listProducts(productsListQuerySchema.parse(request.query)));
};

export const listOptions: RequestHandler = async (_request, response) => {
  response.status(200).json(await listProductOptions());
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

export const listComponents: RequestHandler = async (request, response) => {
  response.status(200).json(await listProductComponents(parseId(request.params.id)));
};

export const addComponent: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json(await addProductComponent(parseId(request.params.id), productComboCreateSchema.parse(request.body)));
};

export const updateComponent: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(
      await updateProductComponent(
        parseId(request.params.id),
        parseId(request.params.containsProductId),
        productComboUpdateSchema.parse(request.body),
      ),
    );
};

export const removeComponent: RequestHandler = async (request, response) => {
  await removeProductComponent(
    parseId(request.params.id),
    parseId(request.params.containsProductId),
  );
  response.status(204).send();
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
