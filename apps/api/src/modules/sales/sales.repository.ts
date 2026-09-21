import { count, desc, eq } from 'drizzle-orm';

import type { SaleCreateInput, SaleUpdateInput, TransactionsListQuery } from '@alitracker/shared';

import { getDatabase } from '../../db/client.js';
import { products } from '../../db/schema/products.js';
import { sales } from '../../db/schema/sales.js';

type DatabaseClient = ReturnType<typeof getDatabase>;

export class SalesRepository {
  constructor(private readonly database?: DatabaseClient) {}

  private get client(): DatabaseClient {
    return this.database ?? getDatabase();
  }

  async findById(id: string) {
    const [sale] = await this.client.select().from(sales).where(eq(sales.id, id));
    return sale;
  }

  async findPage({ page, pageSize }: TransactionsListQuery) {
    const offset = (page - 1) * pageSize;
    const [items, countResult] = await Promise.all([
      this.client
        .select({
          id: sales.id,
          productId: sales.productId,
          imageKey: products.imageKey,
          shortName: products.shortName,
          totalSalePrice: sales.totalSalePrice,
          status: sales.status,
          date: sales.date,
        })
        .from(sales)
        .innerJoin(products, eq(products.id, sales.productId))
        .orderBy(desc(sales.date), desc(sales.id))
        .limit(pageSize)
        .offset(offset),
      this.client.select({ total: count() }).from(sales),
    ]);

    return { items, total: countResult[0]?.total ?? 0 };
  }

  async findProduct(id: string) {
    const [product] = await this.client
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async create(input: SaleCreateInput) {
    const [sale] = await this.client
      .insert(sales)
      .values({
        productId: input.productId,
        totalSalePrice: input.totalSalePrice.toFixed(2),
        status: input.status,
        date: input.date === undefined ? undefined : new Date(input.date),
      })
      .returning();
    return sale;
  }

  async update(id: string, input: SaleUpdateInput) {
    const [sale] = await this.client
      .update(sales)
      .set({
        productId: input.productId,
        totalSalePrice:
          input.totalSalePrice === undefined ? undefined : input.totalSalePrice.toFixed(2),
        status: input.status,
        date: input.date === undefined ? undefined : new Date(input.date),
      })
      .where(eq(sales.id, id))
      .returning();
    return sale;
  }

  async delete(id: string) {
    const [sale] = await this.client.delete(sales).where(eq(sales.id, id)).returning();
    return sale;
  }
}
