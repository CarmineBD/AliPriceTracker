import { asc, count, eq } from 'drizzle-orm';

import type { ProductCreateInput, ProductsListQuery, ProductUpdateInput } from '@alitracker/shared';

import { getDatabase } from '../../db/client';
import { products } from '../../db/schema/products';

export class ProductsRepository {
  async findPage({ page, pageSize }: ProductsListQuery) {
    const offset = (page - 1) * pageSize;
    const database = getDatabase();
    const [items, countResult] = await Promise.all([
      database
        .select()
        .from(products)
        .orderBy(asc(products.name), asc(products.createdAt))
        .limit(pageSize)
        .offset(offset),
      database.select({ total: count() }).from(products),
    ]);

    return { items, total: countResult[0]?.total ?? 0 };
  }

  async findById(id: string) {
    const [product] = await getDatabase().select().from(products).where(eq(products.id, id));
    return product;
  }

  async create(input: ProductCreateInput) {
    const [product] = await getDatabase().insert(products).values(input).returning();
    return product;
  }

  async update(id: string, input: ProductUpdateInput) {
    const [product] = await getDatabase()
      .update(products)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async updateImageKey(id: string, imageKey: string) {
    const [product] = await getDatabase()
      .update(products)
      .set({ imageKey, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async delete(id: string) {
    const [product] = await getDatabase().delete(products).where(eq(products.id, id)).returning();
    return product;
  }
}
