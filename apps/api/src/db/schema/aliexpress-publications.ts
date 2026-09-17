import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
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

import { products } from './products.js';

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
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
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

export const publicationProductHistory = pgTable(
  'publication_product_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    publicationProductId: uuid('publication_product_id')
      .notNull()
      .references(() => publicationProducts.id, { onDelete: 'cascade' }),
    price: numeric('price', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }),
    quantityAvailable: integer('quantity_available'),
    capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('publication_product_history_product_captured_at_index').on(
      table.publicationProductId,
      table.capturedAt,
    ),
  ],
);

export const productBestOfferHistory = pgTable(
  'product_best_offer_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    publicationProductId: uuid('publication_product_id').references(() => publicationProducts.id, {
      onDelete: 'set null',
    }),
    price: numeric('price', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }),
    quantityAvailable: integer('quantity_available'),
    publicationUrl: text('publication_url'),
    isAvailable: boolean('is_available').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('product_best_offer_history_product_captured_at_index').on(
      table.productId,
      table.capturedAt,
    ),
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

export const publicationProductsRelations = relations(publicationProducts, ({ one, many }) => ({
  publication: one(publications, {
    fields: [publicationProducts.publicationId],
    references: [publications.id],
  }),
  product: one(products, {
    fields: [publicationProducts.productId],
    references: [products.id],
  }),
  history: many(publicationProductHistory),
  bestOfferHistory: many(productBestOfferHistory),
}));

export const publicationProductHistoryRelations = relations(
  publicationProductHistory,
  ({ one }) => ({
    publicationProduct: one(publicationProducts, {
      fields: [publicationProductHistory.publicationProductId],
      references: [publicationProducts.id],
    }),
  }),
);

export const productBestOfferHistoryRelations = relations(productBestOfferHistory, ({ one }) => ({
  product: one(products, {
    fields: [productBestOfferHistory.productId],
    references: [products.id],
  }),
  publicationProduct: one(publicationProducts, {
    fields: [productBestOfferHistory.publicationProductId],
    references: [publicationProducts.id],
  }),
}));
