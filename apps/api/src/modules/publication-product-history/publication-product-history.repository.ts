import { and, asc, desc, eq, gte, lt, lte } from 'drizzle-orm';

import { getDatabase } from '../../db/client';
import {
  publicationProductHistory,
  publicationProducts,
  publications,
} from '../../db/schema/aliexpress-publications';

export type PublicationProductHistoryFilters = {
  from?: Date;
  to?: Date;
};

export type PublicationProductHistoryParent = {
  id: string;
  publicationId: string;
  productId: string;
  aliexpressSkuId: string;
  price: string | null;
  currency: string | null;
  quantityAvailable: number | null;
  lastCheckedAt: Date | null;
};

export type PublicationProductHistoryEntry = {
  id: string;
  price: string | null;
  currency: string | null;
  quantityAvailable: number | null;
  capturedAt: Date;
};

export class PublicationProductHistoryRepository {
  async findPublicationProduct(id: string): Promise<PublicationProductHistoryParent | undefined> {
    const [publicationProduct] = await getDatabase()
      .select({
        id: publicationProducts.id,
        publicationId: publicationProducts.publicationId,
        productId: publicationProducts.productId,
        aliexpressSkuId: publicationProducts.aliexpressSkuId,
        price: publicationProducts.price,
        currency: publicationProducts.currency,
        quantityAvailable: publicationProducts.quantityAvailable,
        lastCheckedAt: publications.lastCheckedAt,
      })
      .from(publicationProducts)
      .innerJoin(publications, eq(publications.id, publicationProducts.publicationId))
      .where(eq(publicationProducts.id, id));

    return publicationProduct;
  }

  async findHistory(
    publicationProductId: string,
    { from, to }: PublicationProductHistoryFilters,
  ): Promise<PublicationProductHistoryEntry[]> {
    const conditions = [eq(publicationProductHistory.publicationProductId, publicationProductId)];
    if (from) conditions.push(gte(publicationProductHistory.capturedAt, from));
    if (to) conditions.push(lte(publicationProductHistory.capturedAt, to));

    return getDatabase()
      .select({
        id: publicationProductHistory.id,
        price: publicationProductHistory.price,
        currency: publicationProductHistory.currency,
        quantityAvailable: publicationProductHistory.quantityAvailable,
        capturedAt: publicationProductHistory.capturedAt,
      })
      .from(publicationProductHistory)
      .where(and(...conditions))
      .orderBy(asc(publicationProductHistory.capturedAt));
  }

  async findBaseline(
    publicationProductId: string,
    from: Date,
  ): Promise<PublicationProductHistoryEntry | undefined> {
    const [baseline] = await getDatabase()
      .select({
        id: publicationProductHistory.id,
        price: publicationProductHistory.price,
        currency: publicationProductHistory.currency,
        quantityAvailable: publicationProductHistory.quantityAvailable,
        capturedAt: publicationProductHistory.capturedAt,
      })
      .from(publicationProductHistory)
      .where(
        and(
          eq(publicationProductHistory.publicationProductId, publicationProductId),
          lt(publicationProductHistory.capturedAt, from),
        ),
      )
      .orderBy(desc(publicationProductHistory.capturedAt))
      .limit(1);

    return baseline;
  }
}
