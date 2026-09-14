import { and, asc, count, eq } from 'drizzle-orm';

import type {
  SellerCreateInput,
  SellerProductCreateInput,
  SellerProductUpdateInput,
  SellerProductsListQuery,
  SellerUpdateInput,
  SellersListQuery,
} from '@alitracker/shared';

import { getDatabase } from '../../db/client';
import { sellerProducts, sellers } from '../../db/schema/sellers';

function toSellerValues(input: SellerCreateInput | SellerUpdateInput) {
  return {
    ...input,
    reviewScore:
      input.reviewScore === undefined || input.reviewScore === null
        ? input.reviewScore
        : String(input.reviewScore),
    salesCount:
      input.salesCount === undefined || input.salesCount === null
        ? input.salesCount
        : Number(input.salesCount),
  };
}

export class SellersRepository {
  async findPage({ page, pageSize }: SellersListQuery) {
    const offset = (page - 1) * pageSize;
    const database = getDatabase();
    const [items, countResult] = await Promise.all([
      database
        .select()
        .from(sellers)
        .orderBy(asc(sellers.name), asc(sellers.createdAt))
        .limit(pageSize)
        .offset(offset),
      database.select({ total: count() }).from(sellers),
    ]);

    return { items, total: countResult[0]?.total ?? 0 };
  }

  async findById(id: string) {
    const [seller] = await getDatabase().select().from(sellers).where(eq(sellers.id, id));
    return seller;
  }

  async create(input: SellerCreateInput) {
    const [seller] = await getDatabase().insert(sellers).values(toSellerValues(input)).returning();
    return seller;
  }

  async update(id: string, input: SellerUpdateInput) {
    const [seller] = await getDatabase()
      .update(sellers)
      .set({ ...toSellerValues(input), updatedAt: new Date() })
      .where(eq(sellers.id, id))
      .returning();
    return seller;
  }

  async delete(id: string) {
    const [seller] = await getDatabase().delete(sellers).where(eq(sellers.id, id)).returning();
    return seller;
  }
}

export class SellerProductsRepository {
  async findPage({ page, pageSize, sellerId, productId }: SellerProductsListQuery) {
    const offset = (page - 1) * pageSize;
    const filters = [
      sellerId ? eq(sellerProducts.sellerId, sellerId) : undefined,
      productId ? eq(sellerProducts.productId, productId) : undefined,
    ].filter((filter): filter is NonNullable<typeof filter> => filter !== undefined);
    const where = filters.length > 0 ? and(...filters) : undefined;
    const database = getDatabase();
    const [items, countResult] = await Promise.all([
      database
        .select()
        .from(sellerProducts)
        .where(where)
        .orderBy(asc(sellerProducts.createdAt))
        .limit(pageSize)
        .offset(offset),
      database.select({ total: count() }).from(sellerProducts).where(where),
    ]);

    return { items, total: countResult[0]?.total ?? 0 };
  }

  async findById(id: string) {
    const [sellerProduct] = await getDatabase()
      .select()
      .from(sellerProducts)
      .where(eq(sellerProducts.id, id));
    return sellerProduct;
  }

  async findByAliExpressItemId(aliexpressItemId: string) {
    const [sellerProduct] = await getDatabase()
      .select()
      .from(sellerProducts)
      .where(eq(sellerProducts.aliexpressItemId, aliexpressItemId));
    return sellerProduct;
  }

  async countBySellerId(sellerId: string) {
    const [result] = await getDatabase()
      .select({ total: count() })
      .from(sellerProducts)
      .where(eq(sellerProducts.sellerId, sellerId));
    return result?.total ?? 0;
  }

  async countByProductId(productId: string) {
    const [result] = await getDatabase()
      .select({ total: count() })
      .from(sellerProducts)
      .where(eq(sellerProducts.productId, productId));
    return result?.total ?? 0;
  }

  async create(input: SellerProductCreateInput) {
    const [sellerProduct] = await getDatabase().insert(sellerProducts).values(input).returning();
    return sellerProduct;
  }

  async update(id: string, input: SellerProductUpdateInput) {
    const [sellerProduct] = await getDatabase()
      .update(sellerProducts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(sellerProducts.id, id))
      .returning();
    return sellerProduct;
  }

  async delete(id: string) {
    const [sellerProduct] = await getDatabase()
      .delete(sellerProducts)
      .where(eq(sellerProducts.id, id))
      .returning();
    return sellerProduct;
  }
}
