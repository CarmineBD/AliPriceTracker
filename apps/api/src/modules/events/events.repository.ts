import { and, asc, count, eq, gte, inArray, lte } from 'drizzle-orm';

import type {
  CouponCategory,
  CouponCreateInput,
  CouponUpdateInput,
  CouponsListQuery,
  EventSaveInput,
  EventsListQuery,
} from '@alitracker/shared';

import { getDatabase } from '../../db/client.js';
import { coupons, eventCoupons, events } from '../../db/schema/events.js';

export type ActiveEventCoupon = {
  id: string;
  minPurchase: string;
  discountAmount: string;
  category: CouponCategory | null;
};

export type ActiveEvent = {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  coupons: ActiveEventCoupon[];
};

type DatabaseClient = ReturnType<typeof getDatabase>;

export class EventsRepository {
  constructor(private readonly database?: DatabaseClient) {}

  private get client(): DatabaseClient {
    return this.database ?? getDatabase();
  }

  private async findCouponsByEventIds(
    eventIds: string[],
  ): Promise<Map<string, ActiveEventCoupon[]>> {
    if (eventIds.length === 0) return new Map();

    const rows = await this.client
      .select({
        eventId: eventCoupons.eventId,
        id: coupons.id,
        minPurchase: coupons.minPurchase,
        discountAmount: coupons.discountAmount,
        category: coupons.category,
      })
      .from(eventCoupons)
      .innerJoin(coupons, eq(coupons.id, eventCoupons.couponId))
      .where(inArray(eventCoupons.eventId, eventIds))
      .orderBy(asc(eventCoupons.eventId), asc(coupons.minPurchase), asc(coupons.id));

    const couponsByEventId = new Map<string, ActiveEventCoupon[]>();
    for (const row of rows) {
      const eventCoupons = couponsByEventId.get(row.eventId) ?? [];
      eventCoupons.push({
        id: row.id,
        minPurchase: row.minPurchase,
        discountAmount: row.discountAmount,
        category: row.category,
      });
      couponsByEventId.set(row.eventId, eventCoupons);
    }
    return couponsByEventId;
  }

  private async attachCoupons<T extends { id: string; name: string; startsAt: Date; endsAt: Date }>(
    storedEvents: T[],
  ): Promise<ActiveEvent[]> {
    const couponsByEventId = await this.findCouponsByEventIds(
      storedEvents.map((event) => event.id),
    );
    return storedEvents.map((event) => ({
      id: event.id,
      name: event.name,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      coupons: couponsByEventId.get(event.id) ?? [],
    }));
  }

  async findCouponPage({ page, pageSize }: CouponsListQuery) {
    const offset = (page - 1) * pageSize;
    const [items, countResult] = await Promise.all([
      this.client
        .select()
        .from(coupons)
        .orderBy(asc(coupons.minPurchase), asc(coupons.discountAmount), asc(coupons.id))
        .limit(pageSize)
        .offset(offset),
      this.client.select({ total: count() }).from(coupons),
    ]);
    return { items, total: countResult[0]?.total ?? 0 };
  }

  async findCouponOptions() {
    return this.client
      .select({
        id: coupons.id,
        minPurchase: coupons.minPurchase,
        discountAmount: coupons.discountAmount,
        category: coupons.category,
      })
      .from(coupons)
      .orderBy(asc(coupons.minPurchase), asc(coupons.discountAmount), asc(coupons.id));
  }

  async findCouponCount(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const [result] = await this.client
      .select({ total: count() })
      .from(coupons)
      .where(inArray(coupons.id, ids));
    return result?.total ?? 0;
  }

  async createCoupon(input: CouponCreateInput) {
    const [coupon] = await this.client
      .insert(coupons)
      .values({
        minPurchase: input.minPurchase.toFixed(2),
        discountAmount: input.discountAmount.toFixed(2),
        category: input.category ?? null,
      })
      .returning();
    return coupon;
  }

  async updateCoupon(id: string, input: CouponUpdateInput) {
    const [coupon] = await this.client
      .update(coupons)
      .set({
        minPurchase: input.minPurchase?.toFixed(2),
        discountAmount: input.discountAmount?.toFixed(2),
        category: input.category,
        updatedAt: new Date(),
      })
      .where(eq(coupons.id, id))
      .returning();
    return coupon;
  }

  async deleteCoupon(id: string) {
    const [coupon] = await this.client.delete(coupons).where(eq(coupons.id, id)).returning();
    return coupon;
  }

  async findEventPage({ page, pageSize }: EventsListQuery) {
    const offset = (page - 1) * pageSize;
    const [items, countResult] = await Promise.all([
      this.client
        .select()
        .from(events)
        .orderBy(asc(events.startsAt), asc(events.id))
        .limit(pageSize)
        .offset(offset),
      this.client.select({ total: count() }).from(events),
    ]);
    return { items: await this.attachCoupons(items), total: countResult[0]?.total ?? 0 };
  }

  async findEventById(id: string) {
    const [event] = await this.client.select().from(events).where(eq(events.id, id));
    if (!event) return undefined;
    return (await this.attachCoupons([event]))[0];
  }

  async createEvent(input: EventSaveInput) {
    const created = await this.client.transaction(async (transaction) => {
      const [event] = await transaction
        .insert(events)
        .values({
          name: input.name,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
        })
        .returning();
      if (!event) throw new Error('Event creation did not return an event.');

      if (input.couponIds.length > 0) {
        await transaction
          .insert(eventCoupons)
          .values(input.couponIds.map((couponId) => ({ eventId: event.id, couponId })));
      }
      return event;
    });
    return this.findEventById(created.id);
  }

  async updateEvent(id: string, input: EventSaveInput) {
    const updated = await this.client.transaction(async (transaction) => {
      const [event] = await transaction
        .update(events)
        .set({
          name: input.name,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          updatedAt: new Date(),
        })
        .where(eq(events.id, id))
        .returning();
      if (!event) return undefined;

      await transaction.delete(eventCoupons).where(eq(eventCoupons.eventId, id));
      if (input.couponIds.length > 0) {
        await transaction
          .insert(eventCoupons)
          .values(input.couponIds.map((couponId) => ({ eventId: id, couponId })));
      }
      return event;
    });
    return updated ? this.findEventById(updated.id) : undefined;
  }

  async deleteEvent(id: string) {
    const [event] = await this.client.delete(events).where(eq(events.id, id)).returning();
    return event;
  }

  async findActiveWithCoupons(currentTime: Date): Promise<ActiveEvent[]> {
    const activeEvents = await this.client
      .select()
      .from(events)
      .where(and(lte(events.startsAt, currentTime), gte(events.endsAt, currentTime)))
      .orderBy(asc(events.startsAt), asc(events.id));
    return this.attachCoupons(activeEvents);
  }
}
