import type { RequestHandler } from 'express';

import {
  productIdSchema,
  saleCreateSchema,
  saleUpdateSchema,
  transactionsListQuerySchema,
} from '@alitracker/shared';

import { createSale, deleteSale, listSales, updateSale } from './sales.service.js';

const parseId = (value: unknown) => productIdSchema.parse(value);

export const list: RequestHandler = async (request, response) => {
  response.status(200).json(await listSales(transactionsListQuerySchema.parse(request.query)));
};

export const create: RequestHandler = async (request, response) => {
  response.status(201).json(await createSale(saleCreateSchema.parse(request.body)));
};

export const update: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(await updateSale(parseId(request.params.id), saleUpdateSchema.parse(request.body)));
};

export const remove: RequestHandler = async (request, response) => {
  await deleteSale(parseId(request.params.id));
  response.status(204).send();
};
