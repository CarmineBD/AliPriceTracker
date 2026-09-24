import { asc, eq, sql } from 'drizzle-orm';
import type { SaleStatus } from '@alitracker/shared';

import { getDatabase } from '../../db/client.js';
import { productCombos } from '../../db/schema/product-combos.js';
import { purchases } from '../../db/schema/purchases.js';
import { sales } from '../../db/schema/sales.js';

type DatabaseClient = ReturnType<typeof getDatabase>;

export type PurchaseMovementRow = {
  purchaseId: string;
  productId: string;
  totalFinalPrice: string;
  date: Date;
  componentProductId: string | null;
  componentQuantity: number | null;
  averageSellingPrice: string | null;
};

export type SaleMovementRow = {
  saleId: string;
  productId: string;
  totalSalePrice: string;
  shippingCost: string;
  status: SaleStatus;
  date: Date;
  componentProductId: string | null;
  componentQuantity: number | null;
};

export type MetricsData = {
  totalPurchases: string;
  totalSales: string;
  totalShippingCosts: string;
  purchaseMovements: PurchaseMovementRow[];
  saleMovements: SaleMovementRow[];
};

export class MetricsRepository {
  constructor(private readonly database?: DatabaseClient) {}

  private get client(): DatabaseClient {
    return this.database ?? getDatabase();
  }

  async getMetricsData(): Promise<MetricsData> {
    const purchaseSalePrices = this.client
      .select({
        productId: sales.productId,
        averagePrice: sql<string>`avg(${sales.totalSalePrice})`.as('average_price'),
      })
      .from(sales)
      .groupBy(sales.productId)
      .as('metrics_purchase_sale_prices');
    const componentSalePrices = this.client
      .select({
        productId: sales.productId,
        averagePrice: sql<string>`avg(${sales.totalSalePrice})`.as('average_price'),
      })
      .from(sales)
      .groupBy(sales.productId)
      .as('metrics_component_sale_prices');
    const [purchasesResult, salesResult, shippingCostsResult, purchaseMovements, saleMovements] =
      await Promise.all([
        this.client
          .select({ total: sql<string>`coalesce(sum(${purchases.totalFinalPrice}), 0)` })
          .from(purchases),
        this.client
          .select({ total: sql<string>`coalesce(sum(${sales.totalSalePrice}), 0)` })
          .from(sales),
        this.client
          .select({ total: sql<string>`coalesce(sum(${sales.shippingCost}), 0)` })
          .from(sales),
        this.client
          .select({
            purchaseId: purchases.id,
            productId: purchases.productId,
            totalFinalPrice: purchases.totalFinalPrice,
            date: purchases.date,
            componentProductId: productCombos.containsProductId,
            componentQuantity: productCombos.quantity,
            averageSellingPrice: sql<string | null>`CASE
            WHEN ${productCombos.productId} IS NULL
              THEN ${sql.raw('"metrics_purchase_sale_prices"."average_price"')}
            ELSE ${sql.raw('"metrics_component_sale_prices"."average_price"')}
          END`,
          })
          .from(purchases)
          .leftJoin(productCombos, eq(productCombos.productId, purchases.productId))
          .leftJoin(purchaseSalePrices, eq(purchaseSalePrices.productId, purchases.productId))
          .leftJoin(
            componentSalePrices,
            eq(componentSalePrices.productId, productCombos.containsProductId),
          )
          .where(eq(purchases.status, 'received'))
          .orderBy(asc(purchases.date), asc(purchases.id)),
        this.client
          .select({
            saleId: sales.id,
            productId: sales.productId,
            totalSalePrice: sales.totalSalePrice,
            shippingCost: sales.shippingCost,
            status: sales.status,
            date: sales.date,
            componentProductId: productCombos.containsProductId,
            componentQuantity: productCombos.quantity,
          })
          .from(sales)
          .leftJoin(productCombos, eq(productCombos.productId, sales.productId))
          .orderBy(asc(sales.date), asc(sales.id)),
      ]);

    return {
      totalPurchases: purchasesResult[0]?.total ?? '0',
      totalSales: salesResult[0]?.total ?? '0',
      totalShippingCosts: shippingCostsResult[0]?.total ?? '0',
      purchaseMovements,
      saleMovements,
    };
  }
}
