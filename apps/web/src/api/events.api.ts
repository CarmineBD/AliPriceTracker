import {
  activeEventSchema,
  activeEventsResponseSchema,
  couponCreateSchema,
  couponResponseSchema,
  couponSchema,
  couponsListQuerySchema,
  couponsListResponseSchema,
  couponUpdateSchema,
  eventSaveSchema,
  eventsListQuerySchema,
  eventsListResponseSchema,
  type ActiveEvent,
  type Coupon,
  type CouponCreateInput,
  type CouponResponse,
  type CouponsList,
  type CouponsListQuery,
  type CouponUpdateInput,
  type EventSaveInput,
  type EventsList,
  type EventsListQuery,
} from '@alitracker/shared';

import { request } from './client';

function jsonRequest(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function paginationSearch({ page, pageSize }: CouponsListQuery | EventsListQuery): string {
  return new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
}

export async function getCoupons(query: CouponsListQuery): Promise<CouponsList> {
  const parsedQuery = couponsListQuerySchema.parse(query);
  return couponsListResponseSchema.parse(
    await request<unknown>(`/api/events/coupons?${paginationSearch(parsedQuery)}`),
  );
}

export async function getCouponOptions(): Promise<Coupon[]> {
  return couponSchema.array().parse(await request<unknown>('/api/events/coupons/options'));
}

export async function getActiveEvents(): Promise<ActiveEvent[]> {
  return activeEventsResponseSchema.parse(await request<unknown>('/api/events/active'));
}

export async function createCoupon(input: CouponCreateInput): Promise<CouponResponse> {
  return couponResponseSchema.parse(
    await request<unknown>(
      '/api/events/coupons',
      jsonRequest('POST', couponCreateSchema.parse(input)),
    ),
  );
}

export async function updateCoupon(id: string, input: CouponUpdateInput): Promise<CouponResponse> {
  return couponResponseSchema.parse(
    await request<unknown>(
      `/api/events/coupons/${id}`,
      jsonRequest('PATCH', couponUpdateSchema.parse(input)),
    ),
  );
}

export async function deleteCoupon(id: string): Promise<void> {
  await request<void>(`/api/events/coupons/${id}`, { method: 'DELETE' });
}

export async function getEvents(query: EventsListQuery): Promise<EventsList> {
  const parsedQuery = eventsListQuerySchema.parse(query);
  return eventsListResponseSchema.parse(
    await request<unknown>(`/api/events?${paginationSearch(parsedQuery)}`),
  );
}

export async function createEvent(input: EventSaveInput): Promise<ActiveEvent> {
  return activeEventSchema.parse(
    await request<unknown>('/api/events', jsonRequest('POST', eventSaveSchema.parse(input))),
  );
}

export async function updateEvent(id: string, input: EventSaveInput): Promise<ActiveEvent> {
  return activeEventSchema.parse(
    await request<unknown>(`/api/events/${id}`, jsonRequest('PATCH', eventSaveSchema.parse(input))),
  );
}

export async function deleteEvent(id: string): Promise<void> {
  await request<void>(`/api/events/${id}`, { method: 'DELETE' });
}
