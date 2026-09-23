import { asc, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { getDatabase } from '../../db/client.js';
import { productCombos } from '../../db/schema/product-combos.js';
import { products } from '../../db/schema/products.js';
import { purchases } from '../../db/schema/purchases.js';
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
    return this.client
      .select({
        productId: products.id,
        imageKey: products.imageKey,
        shortName: products.shortName,
        averagePrice: sql<string>`avg(${purchases.totalFinalPrice})`,
      })
      .from(purchases)
      .innerJoin(products, eq(products.id, purchases.productId))
      .groupBy(products.id, products.imageKey, products.shortName)
      .orderBy(asc(products.shortName), asc(products.id));
  }
}
