import { sql } from 'drizzle-orm';
import type { SaleStatus } from '@alitracker/shared';
import { check, index, numeric, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { products } from './products.js';

export const sales = pgTable(
  'sales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    totalSalePrice: numeric('total_sale_price', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 16 }).$type<SaleStatus>().notNull(),
    date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'sales_status_allowed_values',
      sql`${table.status} IN ('to_be_sent', 'sent', 'completed')`,
    ),
    index('sales_product_id_idx').on(table.productId),
    index('sales_date_idx').on(table.date),
  ],
);
