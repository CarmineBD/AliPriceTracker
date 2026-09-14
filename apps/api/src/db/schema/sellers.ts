import {
  bigint,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { products } from './products';

export const sellers = pgTable('sellers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 160 }),
  location: varchar('location', { length: 100 }),
  reviewScore: numeric('review_score'),
  salesCount: bigint('sales_count', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sellerProducts = pgTable(
  'seller_products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantityAvailable: integer('quantity_available').notNull(),
    maxPurchase: integer('max_purchase').notNull(),
    url: text('url').notNull(),
    aliexpressItemId: varchar('aliexpress_item_id', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('seller_products_product_id_idx').on(table.productId),
    index('seller_products_seller_id_idx').on(table.sellerId),
    uniqueIndex('seller_products_aliexpress_item_id_unique').on(table.aliexpressItemId),
  ],
);
