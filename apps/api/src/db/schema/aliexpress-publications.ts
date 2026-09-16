import { relations } from 'drizzle-orm';
import {
  bigint,
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

export const stores = pgTable(
  'stores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    aliexpressStoreId: bigint('aliexpress_store_id', { mode: 'bigint' }).notNull(),
    name: varchar('name', { length: 160 }),
    location: varchar('location', { length: 100 }),
    reviewScore: numeric('review_score'),
    sales180d: varchar('sales_180d', { length: 32 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('stores_aliexpress_store_id_unique').on(table.aliexpressStoreId)],
);

export const publications = pgTable(
  'publications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    aliexpressProductId: bigint('aliexpress_product_id', { mode: 'bigint' }).notNull(),
    name: varchar('name', { length: 500 }),
    url: text('url'),
    salesCount: varchar('sales_count', { length: 32 }),
    reviewScore: numeric('review_score'),
    reviewCount: integer('review_count'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('publications_aliexpress_product_id_unique').on(table.aliexpressProductId),
  ],
);

export const publicationProducts = pgTable(
  'publication_products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    publicationId: uuid('publication_id')
      .notNull()
      .references(() => publications.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    aliexpressSkuId: varchar('aliexpress_sku_id', { length: 32 }).notNull(),
    price: numeric('price', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }),
    quantityAvailable: integer('quantity_available'),
    maxPurchase: integer('max_purchase'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('publication_products_aliexpress_sku_id_unique').on(table.aliexpressSkuId),
  ],
);

export const storesRelations = relations(stores, ({ many }) => ({
  publications: many(publications),
}));

export const publicationsRelations = relations(publications, ({ one, many }) => ({
  store: one(stores, {
    fields: [publications.storeId],
    references: [stores.id],
  }),
  publicationProducts: many(publicationProducts),
}));

export const publicationProductsRelations = relations(publicationProducts, ({ one }) => ({
  publication: one(publications, {
    fields: [publicationProducts.publicationId],
    references: [publications.id],
  }),
  product: one(products, {
    fields: [publicationProducts.productId],
    references: [products.id],
  }),
}));
