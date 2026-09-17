import { Router } from 'express';

import {
  createCouponController,
  createEventController,
  deleteCouponController,
  deleteEventController,
  getActiveEventsController,
  listCouponOptionsController,
  listCouponsController,
  listEventsController,
  updateCouponController,
  updateEventController,
} from './events.controller.js';

export const eventsRouter = Router();

eventsRouter.get('/active', getActiveEventsController);
eventsRouter.get('/coupons', listCouponsController);
eventsRouter.get('/coupons/options', listCouponOptionsController);
eventsRouter.post('/coupons', createCouponController);
eventsRouter.patch('/coupons/:id', updateCouponController);
eventsRouter.delete('/coupons/:id', deleteCouponController);
eventsRouter.get('/', listEventsController);
eventsRouter.post('/', createEventController);
eventsRouter.patch('/:id', updateEventController);
eventsRouter.delete('/:id', deleteEventController);
