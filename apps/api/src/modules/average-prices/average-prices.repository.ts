import { asc, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { getDatabase } from '../../db/client.js';
import { productCombos } from '../../db/schema/product-combos.js';
import { products } from '../../db/schema/products.js';
import { sales } from '../../db/schema/sales.js';

type DatabaseClient = ReturnType<typeof getDatabase>;

export type AveragePriceRow = {
  productId: string;
  imageKey: string | null;
  shortName: string;
  averagePrice: string;
};

export class AveragePricesRepository {
  constructor(private readonly database?: DatabaseClient) {}

  private get client(): DatabaseClient {
    return this.database ?? getDatabase();
  }

  async findSales(): Promise<AveragePriceRow[]> {
    return this.client
      .select({
        productId: products.id,
        imageKey: products.imageKey,
        shortName: products.shortName,
        averagePrice: sql<string>`avg(${sales.totalSalePrice})`,
      })
      .from(sales)
      .innerJoin(products, eq(products.id, sales.productId))
      // Combos have a derived price and must not bypass its complete-component requirement.
      .leftJoin(productCombos, eq(productCombos.productId, products.id))
      .where(isNull(productCombos.productId))
      .groupBy(products.id, products.imageKey, products.shortName)
      .orderBy(asc(products.shortName), asc(products.id));
  }

  async findComboSales(): Promise<AveragePriceRow[]> {
    const comboProducts = alias(products, 'combo_products');
    const componentSales = this.client
      .select({
        productId: sales.productId,
        averagePrice: sql<string>`avg(${sales.totalSalePrice})`.as('average_price'),
      })
      .from(sales)
      .groupBy(sales.productId)
      .as('component_sales');

    return this.client
      .select({
        productId: comboProducts.id,
        imageKey: comboProducts.imageKey,
        shortName: comboProducts.shortName,
        // A component can have a quantity greater than one in a combo.
        averagePrice: sql<string>`sum(${componentSales.averagePrice} * ${productCombos.quantity})`,
      })
      .from(productCombos)
      .innerJoin(comboProducts, eq(comboProducts.id, productCombos.productId))
      .leftJoin(componentSales, eq(componentSales.productId, productCombos.containsProductId))
      .groupBy(comboProducts.id, comboProducts.imageKey, comboProducts.shortName)
      // count(column) skips NULL values, so this retains only fully priced combos.
      .having(sql`count(${componentSales.productId}) = count(${productCombos.containsProductId})`)
      .orderBy(asc(comboProducts.shortName), asc(comboProducts.id));
  }

  async findPurchases(): Promise<AveragePriceRow[]> {
    const result = await this.client.execute<AveragePriceRow>(sql`
      WITH component_sale_prices AS (
        SELECT
          sale.product_id AS product_id,
          avg(sale.total_sale_price) AS average_price
        FROM sales AS sale
        GROUP BY sale.product_id
      ),
      combo_purchase_components AS (
        SELECT
          purchase.id AS purchase_id,
          purchase.total_final_price,
          component.contains_product_id,
          component.quantity,
          component_sale_prices.average_price,
          sum(component_sale_prices.average_price * component.quantity)
            OVER (PARTITION BY purchase.id) AS total_component_sale_value,
          count(component_sale_prices.product_id)
            OVER (PARTITION BY purchase.id) AS priced_component_count,
          count(component.contains_product_id)
            OVER (PARTITION BY purchase.id) AS component_count
        FROM purchases AS purchase
        INNER JOIN product_combos AS component ON component.product_id = purchase.product_id
        LEFT JOIN component_sale_prices
          ON component_sale_prices.product_id = component.contains_product_id
      ),
      purchase_costs AS (
        -- Every direct purchase is one purchased unit, including the combo itself.
        SELECT
          purchase.product_id,
          purchase.total_final_price AS assigned_cost,
          1 AS quantity
        FROM purchases AS purchase

        UNION ALL

        -- A combo purchase is also expanded into the estimated costs of its components.
        SELECT
          contains_product_id AS product_id,
          total_final_price * (
            (average_price * quantity) / total_component_sale_value
          ) AS assigned_cost,
          quantity
        FROM combo_purchase_components
        WHERE priced_component_count = component_count
          AND total_component_sale_value > 0
      )
      SELECT
        product.id AS "productId",
        product.image_key AS "imageKey",
        product.short_name AS "shortName",
        sum(purchase_costs.assigned_cost) / sum(purchase_costs.quantity) AS "averagePrice"
      FROM purchase_costs
      INNER JOIN products AS product ON product.id = purchase_costs.product_id
      GROUP BY product.id, product.image_key, product.short_name
      ORDER BY product.short_name ASC, product.id ASC
    `);

    return [...result];
  }
}
