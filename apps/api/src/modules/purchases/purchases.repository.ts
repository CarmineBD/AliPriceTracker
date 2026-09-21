import { count, desc, eq } from 'drizzle-orm';

import type {
  PurchaseCreateInput,
  PurchaseUpdateInput,
  TransactionsListQuery,
} from '@alitracker/shared';

import { getDatabase } from '../../db/client.js';
import { publicationProducts, publications } from '../../db/schema/aliexpress-publications.js';
import { products } from '../../db/schema/products.js';
import { purchases } from '../../db/schema/purchases.js';

type DatabaseClient = ReturnType<typeof getDatabase>;

export class PurchasesRepository {
  constructor(private readonly database?: DatabaseClient) {}

  private get client(): DatabaseClient {
    return this.database ?? getDatabase();
  }

  async findById(id: string) {
    const [purchase] = await this.client.select().from(purchases).where(eq(purchases.id, id));
    return purchase;
  }

  async findPage({ page, pageSize }: TransactionsListQuery) {
    const offset = (page - 1) * pageSize;
    const [items, countResult] = await Promise.all([
      this.client
        .select({
          id: purchases.id,
          productId: purchases.productId,
          offerId: purchases.offerId,
          imageKey: products.imageKey,
          shortName: products.shortName,
          publicationUrl: publications.url,
          totalFinalPrice: purchases.totalFinalPrice,
          status: purchases.status,
          date: purchases.date,
        })
        .from(purchases)
        .innerJoin(products, eq(products.id, purchases.productId))
        .leftJoin(publicationProducts, eq(publicationProducts.id, purchases.offerId))
        .leftJoin(publications, eq(publications.id, publicationProducts.publicationId))
        .orderBy(desc(purchases.date), desc(purchases.id))
        .limit(pageSize)
        .offset(offset),
      this.client.select({ total: count() }).from(purchases),
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

  async findOffer(id: string) {
    const [offer] = await this.client
      .select({ id: publicationProducts.id, productId: publicationProducts.productId })
      .from(publicationProducts)
      .where(eq(publicationProducts.id, id));
    return offer;
  }

  async create(input: PurchaseCreateInput) {
    const [purchase] = await this.client
      .insert(purchases)
      .values({
        productId: input.productId,
        offerId: input.offerId ?? null,
        totalFinalPrice: input.totalFinalPrice.toFixed(2),
        status: input.status,
        date: input.date === undefined ? undefined : new Date(input.date),
      })
      .returning();
    return purchase;
  }

  async update(id: string, input: PurchaseUpdateInput) {
    const [purchase] = await this.client
      .update(purchases)
      .set({
        productId: input.productId,
        offerId: input.offerId,
        totalFinalPrice:
          input.totalFinalPrice === undefined ? undefined : input.totalFinalPrice.toFixed(2),
        status: input.status,
        date: input.date === undefined ? undefined : new Date(input.date),
      })
      .where(eq(purchases.id, id))
      .returning();
    return purchase;
  }

  async delete(id: string) {
    const [purchase] = await this.client.delete(purchases).where(eq(purchases.id, id)).returning();
    return purchase;
  }
}
