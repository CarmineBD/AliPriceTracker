import type { RequestHandler } from 'express';

import {
  productIdSchema,
  purchaseCreateSchema,
  purchaseUpdateSchema,
  transactionsListQuerySchema,
} from '@alitracker/shared';

import {
  createPurchase,
  deletePurchase,
  listPurchases,
  updatePurchase,
} from './purchases.service.js';

const parseId = (value: unknown) => productIdSchema.parse(value);

export const list: RequestHandler = async (request, response) => {
  response.status(200).json(await listPurchases(transactionsListQuerySchema.parse(request.query)));
};

export const create: RequestHandler = async (request, response) => {
  response.status(201).json(await createPurchase(purchaseCreateSchema.parse(request.body)));
};

export const update: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(
      await updatePurchase(parseId(request.params.id), purchaseUpdateSchema.parse(request.body)),
    );
};

export const remove: RequestHandler = async (request, response) => {
  await deletePurchase(parseId(request.params.id));
  response.status(204).send();
};
