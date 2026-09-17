import { sql } from 'drizzle-orm';
import {
  check,
  index,
  numeric,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  minPurchase: numeric('min_purchase', { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check('events_ends_at_after_starts_at', sql`${table.endsAt} > ${table.startsAt}`),
    index('events_ends_at_starts_at_idx').on(table.endsAt, table.startsAt),
  ],
);

export const eventCoupons = pgTable(
  'event_coupons',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.couponId], name: 'event_coupons_pkey' }),
    index('event_coupons_coupon_id_idx').on(table.couponId),
  ],
);
