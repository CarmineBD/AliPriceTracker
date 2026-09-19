import type {
  Coupon,
  CouponCategory,
  CouponCreateInput,
  CouponUpdateInput,
  CouponsListQuery,
  EventSaveInput,
  EventsListQuery,
} from '@alitracker/shared';

import { EventsRepository, type ActiveEvent } from './events.repository.js';
import { HttpError } from '../../utils/http-error.js';

type ActiveEventsRepository = Pick<EventsRepository, 'findActiveWithCoupons'>;
const repository = new EventsRepository();

export type BestCouponResult = {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  coupon: Coupon | null;
};

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Selects the applicable coupon that produces the lowest final price. Equal final prices use the
 * lexicographically smaller coupon id, which keeps the result independent of the input order.
 */
export function selectBestCoupon(price: number, coupons: Coupon[]): BestCouponResult {
  const originalPriceInCents = toCents(price);
  let bestCoupon: Coupon | null = null;
  let bestFinalPriceInCents = originalPriceInCents;

  for (const coupon of coupons) {
    const minPurchaseInCents = toCents(coupon.minPurchase);
    if (originalPriceInCents < minPurchaseInCents) continue;

    const finalPriceInCents = originalPriceInCents - toCents(coupon.discountAmount);
    if (
      bestCoupon === null ||
      finalPriceInCents < bestFinalPriceInCents ||
      (finalPriceInCents === bestFinalPriceInCents &&
        bestCoupon !== null &&
        coupon.id.localeCompare(bestCoupon.id) < 0)
    ) {
      bestCoupon = coupon;
      bestFinalPriceInCents = finalPriceInCents;
    }
  }

  return {
    originalPrice: price,
    discountAmount: bestCoupon?.discountAmount ?? 0,
    finalPrice: bestFinalPriceInCents / 100,
    coupon: bestCoupon,
  };
}

function toActiveEvent(event: ActiveEvent) {
  return {
    id: event.id,
    name: event.name,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    coupons: event.coupons.map((coupon) => ({
      id: coupon.id,
      minPurchase: Number(coupon.minPurchase),
      discountAmount: Number(coupon.discountAmount),
      category: coupon.category,
    })),
  };
}

function toCouponResponse(coupon: {
  id: string;
  minPurchase: string;
  discountAmount: string;
  category: CouponCategory | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: coupon.id,
    minPurchase: Number(coupon.minPurchase),
    discountAmount: Number(coupon.discountAmount),
    category: coupon.category,
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString(),
  };
}

async function assertCouponsExist(
  couponIds: string[],
  eventsRepository: Pick<EventsRepository, 'findCouponCount'>,
) {
  if ((await eventsRepository.findCouponCount(couponIds)) !== couponIds.length) {
    throw new HttpError('Uno o varios cupones no existen.', 400);
  }
}

export async function getActiveEvents(
  currentTime = new Date(),
  eventsRepository: ActiveEventsRepository = repository,
) {
  return (await eventsRepository.findActiveWithCoupons(currentTime)).map(toActiveEvent);
}

export async function listCoupons(
  query: CouponsListQuery,
  eventsRepository: Pick<EventsRepository, 'findCouponPage'> = repository,
) {
  const { items, total } = await eventsRepository.findCouponPage(query);
  return {
    coupons: items.map(toCouponResponse),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function listCouponOptions(
  eventsRepository: Pick<EventsRepository, 'findCouponOptions'> = repository,
) {
  return (await eventsRepository.findCouponOptions()).map((coupon) => ({
    id: coupon.id,
    minPurchase: Number(coupon.minPurchase),
    discountAmount: Number(coupon.discountAmount),
    category: coupon.category,
  }));
}

export async function createCoupon(
  input: CouponCreateInput,
  eventsRepository: Pick<EventsRepository, 'createCoupon'> = repository,
) {
  const coupon = await eventsRepository.createCoupon(input);
  if (!coupon) throw new Error('Coupon creation did not return a coupon.');
  return toCouponResponse(coupon);
}

export async function updateCoupon(
  id: string,
  input: CouponUpdateInput,
  eventsRepository: Pick<EventsRepository, 'updateCoupon'> = repository,
) {
  const coupon = await eventsRepository.updateCoupon(id, input);
  if (!coupon) throw new HttpError('Coupon not found.', 404);
  return toCouponResponse(coupon);
}

export async function deleteCoupon(
  id: string,
  eventsRepository: Pick<EventsRepository, 'deleteCoupon'> = repository,
) {
  if (!(await eventsRepository.deleteCoupon(id))) throw new HttpError('Coupon not found.', 404);
}

export async function listEvents(
  query: EventsListQuery,
  eventsRepository: Pick<EventsRepository, 'findEventPage'> = repository,
) {
  const { items, total } = await eventsRepository.findEventPage(query);
  return {
    events: items.map(toActiveEvent),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function createEvent(
  input: EventSaveInput,
  eventsRepository: Pick<EventsRepository, 'createEvent' | 'findCouponCount'> = repository,
) {
  await assertCouponsExist(input.couponIds, eventsRepository);
  const event = await eventsRepository.createEvent(input);
  if (!event) throw new Error('Event creation did not return an event.');
  return toActiveEvent(event);
}

export async function updateEvent(
  id: string,
  input: EventSaveInput,
  eventsRepository: Pick<EventsRepository, 'findCouponCount' | 'updateEvent'> = repository,
) {
  await assertCouponsExist(input.couponIds, eventsRepository);
  const event = await eventsRepository.updateEvent(id, input);
  if (!event) throw new HttpError('Event not found.', 404);
  return toActiveEvent(event);
}

export async function deleteEvent(
  id: string,
  eventsRepository: Pick<EventsRepository, 'deleteEvent'> = repository,
) {
  if (!(await eventsRepository.deleteEvent(id))) throw new HttpError('Event not found.', 404);
}
