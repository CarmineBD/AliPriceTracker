import { sql } from 'drizzle-orm';

import { getDatabase } from '../../db/client.js';

type DatabaseClient = ReturnType<typeof getDatabase>;
type StockDatabase = Pick<DatabaseClient, 'execute'>;

export type StockRow = {
  productId: string;
  imageKey: string | null;
  name: string;
  shortName: string;
  quantity: number;
  orderedQuantity: number;
  toBeSentQuantity: number;
};

export class StockRepository {
  constructor(private readonly database?: StockDatabase) {}

  private get client(): StockDatabase {
    return this.database ?? getDatabase();
  }

  /**
   * Each purchase and sale record is one unit. Combo movements are expanded to their direct
   * components, because combo products are not independently storable inventory.
   */
  async findAll(): Promise<StockRow[]> {
    const result = await this.client.execute<StockRow>(sql`
      WITH purchase_movements AS (
        SELECT
          COALESCE(purchase_component.contains_product_id, purchase.product_id) AS "stockProductId",
          COALESCE(purchase_component.quantity, 1) AS "movementQuantity",
          purchase.status
        FROM purchases AS purchase
        LEFT JOIN product_combos AS purchase_component
          ON purchase_component.product_id = purchase.product_id
      ),
      purchase_stock AS (
        SELECT
          "stockProductId",
          COALESCE(
            sum("movementQuantity") FILTER (WHERE status = 'received'),
            0
          )::int AS "receivedQuantity",
          COALESCE(
            sum("movementQuantity") FILTER (WHERE status = 'ordered'),
            0
          )::int AS "orderedQuantity"
        FROM purchase_movements
        GROUP BY "stockProductId"
      ),
      sale_movements AS (
        SELECT
          COALESCE(sale_component.contains_product_id, sale.product_id) AS "stockProductId",
          COALESCE(sale_component.quantity, 1) AS "movementQuantity",
          sale.status
        FROM sales AS sale
        LEFT JOIN product_combos AS sale_component
          ON sale_component.product_id = sale.product_id
      ),
      sale_stock AS (
        SELECT
          "stockProductId",
          COALESCE(
            sum("movementQuantity") FILTER (WHERE status = 'completed'),
            0
          )::int AS "completedQuantity",
          COALESCE(
            sum("movementQuantity") FILTER (WHERE status = 'to_be_sent'),
            0
          )::int AS "toBeSentQuantity"
        FROM sale_movements
        GROUP BY "stockProductId"
      )
      SELECT
        product.id AS "productId",
        product.image_key AS "imageKey",
        product.name,
        product.short_name AS "shortName",
        COALESCE(purchase_stock."receivedQuantity", 0) -
          COALESCE(sale_stock."completedQuantity", 0) AS quantity,
        COALESCE(purchase_stock."orderedQuantity", 0) AS "orderedQuantity",
        COALESCE(sale_stock."toBeSentQuantity", 0) AS "toBeSentQuantity"
      FROM products AS product
      LEFT JOIN purchase_stock ON purchase_stock."stockProductId" = product.id
      LEFT JOIN sale_stock ON sale_stock."stockProductId" = product.id
      WHERE NOT EXISTS (
        SELECT 1
        FROM product_combos AS product_component
        WHERE product_component.product_id = product.id
      )
      ORDER BY product.name ASC, product.created_at ASC
    `);

    return [...result];
  }
}
