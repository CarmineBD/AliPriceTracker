import type { RequestHandler } from 'express';

import {
  sellerCreateSchema,
  sellerIdSchema,
  sellerProductCreateSchema,
  sellerProductIdSchema,
  sellerProductUpdateSchema,
  sellerProductsListQuerySchema,
  sellerUpdateSchema,
  sellersListQuerySchema,
} from '@alitracker/shared';

import {
  createSeller,
  createSellerProduct,
  deleteSeller,
  deleteSellerProduct,
  getSeller,
  getSellerProduct,
  listSellerProducts,
  listSellers,
  updateSeller,
  updateSellerProduct,
} from './sellers.service';

export const list: RequestHandler = async (request, response) => {
  response.status(200).json(await listSellers(sellersListQuerySchema.parse(request.query)));
};

export const getById: RequestHandler = async (request, response) => {
  response.status(200).json(await getSeller(sellerIdSchema.parse(request.params.id)));
};

export const create: RequestHandler = async (request, response) => {
  response.status(201).json(await createSeller(sellerCreateSchema.parse(request.body)));
};

export const update: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(
      await updateSeller(
        sellerIdSchema.parse(request.params.id),
        sellerUpdateSchema.parse(request.body),
      ),
    );
};

export const remove: RequestHandler = async (request, response) => {
  await deleteSeller(sellerIdSchema.parse(request.params.id));
  response.status(204).send();
};

export const listProducts: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(await listSellerProducts(sellerProductsListQuerySchema.parse(request.query)));
};

export const getProductById: RequestHandler = async (request, response) => {
  response.status(200).json(await getSellerProduct(sellerProductIdSchema.parse(request.params.id)));
};

export const createProduct: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json(await createSellerProduct(sellerProductCreateSchema.parse(request.body)));
};

export const updateProduct: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(
      await updateSellerProduct(
        sellerProductIdSchema.parse(request.params.id),
        sellerProductUpdateSchema.parse(request.body),
      ),
    );
};

export const removeProduct: RequestHandler = async (request, response) => {
  await deleteSellerProduct(sellerProductIdSchema.parse(request.params.id));
  response.status(204).send();
};
