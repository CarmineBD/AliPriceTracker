import { asc, count, eq, getTableColumns, sql } from 'drizzle-orm';

import type { ProductCreateInput, ProductsListQuery, ProductUpdateInput } from '@alitracker/shared';

import { getDatabase } from '../../db/client';
import { products } from '../../db/schema/products';
import { sellerProducts, sellers } from '../../db/schema/sellers';

export class ProductsRepository {
  async findPage({ page, pageSize }: ProductsListQuery) {
    const offset = (page - 1) * pageSize;
    const database = getDatabase();
    const offersCount = sql<number>`(
      SELECT count(*)::int
      FROM ${sellerProducts}
      WHERE ${sellerProducts.productId} = ${products.id}
    )`.as('offers_count');
    const [items, countResult] = await Promise.all([
      database
        .select({ ...getTableColumns(products), offersCount })
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

  async findByIdWithOffers(id: string) {
    const product = await this.findById(id);

    if (!product) {
      return undefined;
    }

    const offers = await getDatabase()
      .select({
        id: sellerProducts.id,
        sellerName: sellers.name,
        sellerLocation: sellers.location,
        sellerReviewScore: sellers.reviewScore,
        sellerSalesCount: sellers.salesCount,
        quantityAvailable: sellerProducts.quantityAvailable,
        maxPurchase: sellerProducts.maxPurchase,
        url: sellerProducts.url,
      })
      .from(sellerProducts)
      .innerJoin(sellers, eq(sellerProducts.sellerId, sellers.id))
      .where(eq(sellerProducts.productId, id))
      .orderBy(asc(sellers.name), asc(sellerProducts.createdAt));

    return { product, offers };
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
