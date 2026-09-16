import { asc, count, eq, getTableColumns, sql } from 'drizzle-orm';

import type { ProductCreateInput, ProductsListQuery, ProductUpdateInput } from '@alitracker/shared';

import { getDatabase } from '../../db/client';
import { publicationProducts, publications, stores } from '../../db/schema/aliexpress-publications';
import { products } from '../../db/schema/products';

export class ProductsRepository {
  async findPage({ page, pageSize }: ProductsListQuery) {
    const offset = (page - 1) * pageSize;
    const database = getDatabase();
    const offersCount = sql<number>`(
      SELECT count(*)::int
      FROM ${publicationProducts}
      WHERE ${publicationProducts.productId} = ${products.id}
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
        id: publicationProducts.id,
        sellerName: stores.name,
        sellerLocation: stores.location,
        sellerReviewScore: stores.reviewScore,
        sellerSalesCount: sql<number | null>`null`,
        quantityAvailable: publicationProducts.quantityAvailable,
        maxPurchase: publicationProducts.maxPurchase,
        url: publications.url,
      })
      .from(publicationProducts)
      .innerJoin(publications, eq(publicationProducts.publicationId, publications.id))
      .innerJoin(stores, eq(publications.storeId, stores.id))
      .where(eq(publicationProducts.productId, id))
      .orderBy(asc(stores.name), asc(publicationProducts.createdAt));

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
