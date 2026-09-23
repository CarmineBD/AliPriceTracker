import { sql } from 'drizzle-orm';

import { getDatabase } from '../../db/client.js';
import { purchases } from '../../db/schema/purchases.js';
import { sales } from '../../db/schema/sales.js';

type DatabaseClient = ReturnType<typeof getDatabase>;

export class MetricsRepository {
  constructor(private readonly database?: DatabaseClient) {}

  private get client(): DatabaseClient {
    return this.database ?? getDatabase();
  }

  async getTotals() {
    const [purchasesResult, salesResult] = await Promise.all([
      this.client
        .select({ total: sql<string>`coalesce(sum(${purchases.totalFinalPrice}), 0)` })
        .from(purchases),
      this.client
        .select({ total: sql<string>`coalesce(sum(${sales.totalSalePrice}), 0)` })
        .from(sales),
    ]);

    return {
      totalPurchases: purchasesResult[0]?.total ?? '0',
      totalSales: salesResult[0]?.total ?? '0',
    };
  }
}
