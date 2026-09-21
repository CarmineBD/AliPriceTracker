import { sql } from 'drizzle-orm';
import type { PurchaseStatus } from '@alitracker/shared';
import {
  check,
  foreignKey,
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { publicationProducts } from './aliexpress-publications.js';
import { products } from './products.js';

export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => publicationProducts.id),
    totalFinalPrice: numeric('total_final_price', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 16 }).$type<PurchaseStatus>().notNull(),
    date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'purchases_status_allowed_values',
      sql`${table.status} IN ('ordered', 'received', 'returned')`,
    ),
    foreignKey({
      columns: [table.productId, table.offerId],
      foreignColumns: [publicationProducts.productId, publicationProducts.id],
      name: 'purchases_product_offer_matches_publication_product_fk',
    }),
    index('purchases_product_id_idx').on(table.productId),
    index('purchases_offer_id_idx').on(table.offerId),
    index('purchases_date_idx').on(table.date),
  ],
);
