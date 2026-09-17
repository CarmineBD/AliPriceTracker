import { pgTable, text, timestamp, uuid, varchar, numeric } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  shortName: varchar('short_name', { length: 80 }).notNull(),
  iconUrl: text('icon_url'),
  imageKey: text('image_key'),
  description: text('description'),
  averageSellingPrice: numeric('average_selling_price', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
