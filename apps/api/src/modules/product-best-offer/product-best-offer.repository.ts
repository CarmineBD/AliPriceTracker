import { and, asc, desc, eq, gte, lt, lte } from 'drizzle-orm';

import { getDatabase } from '../../db/client.js';
import {
  productBestOfferHistory,
  publicationProducts,
  publications,
} from '../../db/schema/aliexpress-publications.js';
import { products } from '../../db/schema/products.js';

export type ProductOffer = {
  publicationProductId: string;
  price: string | null;
  currency: string | null;
  quantityAvailable: number | null;
  publicationUrl: string | null;
};

export type BestOfferState = {
  publicationProductId: string | null;
  price: string | null;
  currency: string | null;
  quantityAvailable: number | null;
  publicationUrl: string | null;
  isAvailable: boolean;
};

export type ProductBestOfferHistoryEntry = BestOfferState & { id: string; capturedAt: Date };
export type ProductBestOfferHistoryFilters = { from?: Date; to?: Date };

type DatabaseClient = ReturnType<typeof getDatabase>;

function sameState(left: BestOfferState, right: BestOfferState): boolean {
  return (
    left.isAvailable === right.isAvailable &&
    left.publicationProductId === right.publicationProductId &&
    left.price === right.price &&
    left.currency === right.currency &&
    left.quantityAvailable === right.quantityAvailable &&
    left.publicationUrl === right.publicationUrl
  );
}

export class ProductBestOfferRepository {
  constructor(private readonly database?: DatabaseClient) {}

  private get client(): DatabaseClient {
    return this.database ?? getDatabase();
  }

  async findProductOffers(): Promise<Map<string, ProductOffer[]>> {
    const rows = await this.client
      .select({
        productId: publicationProducts.productId,
        publicationProductId: publicationProducts.id,
        price: publicationProducts.price,
        currency: publicationProducts.currency,
        quantityAvailable: publicationProducts.quantityAvailable,
        publicationUrl: publications.url,
      })
      .from(publicationProducts)
      .innerJoin(publications, eq(publications.id, publicationProducts.publicationId))
      .orderBy(asc(publicationProducts.productId), asc(publicationProducts.id));

    const offersByProduct = new Map<string, ProductOffer[]>();
    for (const row of rows) {
      const offers = offersByProduct.get(row.productId) ?? [];
      offers.push({
        publicationProductId: row.publicationProductId,
        price: row.price,
        currency: row.currency,
        quantityAvailable: row.quantityAvailable,
        publicationUrl: row.publicationUrl,
      });
      offersByProduct.set(row.productId, offers);
    }
    return offersByProduct;
  }

  async saveIfChanged(
    productId: string,
    state: BestOfferState,
    capturedAt: Date,
  ): Promise<'initial' | 'changed' | 'unchanged'> {
    return this.client.transaction(async (transaction) => {
      // Serializes snapshots for this product if a scheduler is accidentally overlapped.
      await transaction
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, productId))
        .for('update');

      const [last] = await transaction
        .select({
          publicationProductId: productBestOfferHistory.publicationProductId,
          price: productBestOfferHistory.price,
          currency: productBestOfferHistory.currency,
          quantityAvailable: productBestOfferHistory.quantityAvailable,
          publicationUrl: productBestOfferHistory.publicationUrl,
          isAvailable: productBestOfferHistory.isAvailable,
        })
        .from(productBestOfferHistory)
        .where(eq(productBestOfferHistory.productId, productId))
        .orderBy(desc(productBestOfferHistory.capturedAt), desc(productBestOfferHistory.id))
        .limit(1);

      if (last && sameState(last, state)) return 'unchanged';

      await transaction.insert(productBestOfferHistory).values({ productId, ...state, capturedAt });
      return last ? 'changed' : 'initial';
    });
  }

  async findProduct(id: string) {
    const [product] = await this.client
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async findHistory(productId: string, { from, to }: ProductBestOfferHistoryFilters) {
    const conditions = [eq(productBestOfferHistory.productId, productId)];
    if (from) conditions.push(gte(productBestOfferHistory.capturedAt, from));
    if (to) conditions.push(lte(productBestOfferHistory.capturedAt, to));
    return this.client
      .select()
      .from(productBestOfferHistory)
      .where(and(...conditions))
      .orderBy(asc(productBestOfferHistory.capturedAt), asc(productBestOfferHistory.id));
  }

  async findBaseline(productId: string, from: Date) {
    const [baseline] = await this.client
      .select()
      .from(productBestOfferHistory)
      .where(
        and(
          eq(productBestOfferHistory.productId, productId),
          lt(productBestOfferHistory.capturedAt, from),
        ),
      )
      .orderBy(desc(productBestOfferHistory.capturedAt), desc(productBestOfferHistory.id))
      .limit(1);
    return baseline;
  }

  async findCurrent(productId: string) {
    const [current] = await this.client
      .select()
      .from(productBestOfferHistory)
      .where(eq(productBestOfferHistory.productId, productId))
      .orderBy(desc(productBestOfferHistory.capturedAt), desc(productBestOfferHistory.id))
      .limit(1);
    return current;
  }
}
