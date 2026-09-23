import { asc, eq, sql } from 'drizzle-orm';

import { getDatabase } from '../../db/client.js';
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
      .groupBy(products.id, products.imageKey, products.shortName)
      .orderBy(asc(products.shortName), asc(products.id));
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
