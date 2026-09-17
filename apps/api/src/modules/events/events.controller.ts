import type { RequestHandler } from 'express';

import {
  couponCreateSchema,
  couponUpdateSchema,
  couponsListQuerySchema,
  eventSaveSchema,
  eventsListQuerySchema,
  productIdSchema,
} from '@alitracker/shared';

import {
  createCoupon,
  createEvent,
  deleteCoupon,
  deleteEvent,
  getActiveEvents,
  listCouponOptions,
  listCoupons,
  listEvents,
  updateCoupon,
  updateEvent,
} from './events.service.js';

const parseId = (value: unknown) => productIdSchema.parse(value);

export const getActiveEventsController: RequestHandler = async (_request, response) => {
  response.status(200).json(await getActiveEvents());
};

export const listCouponsController: RequestHandler = async (request, response) => {
  response.status(200).json(await listCoupons(couponsListQuerySchema.parse(request.query)));
};

export const listCouponOptionsController: RequestHandler = async (_request, response) => {
  response.status(200).json(await listCouponOptions());
};

export const createCouponController: RequestHandler = async (request, response) => {
  response.status(201).json(await createCoupon(couponCreateSchema.parse(request.body)));
};

export const updateCouponController: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(await updateCoupon(parseId(request.params.id), couponUpdateSchema.parse(request.body)));
};

export const deleteCouponController: RequestHandler = async (request, response) => {
  await deleteCoupon(parseId(request.params.id));
  response.status(204).send();
};

export const listEventsController: RequestHandler = async (request, response) => {
  response.status(200).json(await listEvents(eventsListQuerySchema.parse(request.query)));
};

export const createEventController: RequestHandler = async (request, response) => {
  response.status(201).json(await createEvent(eventSaveSchema.parse(request.body)));
};

export const updateEventController: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(await updateEvent(parseId(request.params.id), eventSaveSchema.parse(request.body)));
};

export const deleteEventController: RequestHandler = async (request, response) => {
  await deleteEvent(parseId(request.params.id));
  response.status(204).send();
};
