import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, unique, uuid } from 'drizzle-orm/pg-core';

import { products } from './products';

export const productCombos = pgTable(
  'product_combos',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    containsProductId: uuid('contains_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
  },
  (table) => [
    unique('product_combos_product_id_contains_product_id_unique').on(
      table.productId,
      table.containsProductId,
    ),
    check('product_combos_quantity_positive', sql`${table.quantity} > 0`),
    check('product_combos_no_self_reference', sql`${table.productId} <> ${table.containsProductId}`),
    index('product_combos_contains_product_id_idx').on(table.containsProductId),
  ],
);
