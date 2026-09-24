import { desc, eq, exists, gte, isNull, sql } from 'drizzle-orm';

import { getDatabase } from '../../db/client.js';
import {
  productBestOfferHistory,
  publicationProducts,
} from '../../db/schema/aliexpress-publications.js';
import { productCombos } from '../../db/schema/product-combos.js';
import { products } from '../../db/schema/products.js';
import { sales } from '../../db/schema/sales.js';

type DatabaseClient = ReturnType<typeof getDatabase>;

export type CurrentProductOffer = {
  productId: string;
  name: string;
  shortName: string;
  iconUrl: string | null;
  imageKey: string | null;
  averageSellingPrice: string | null;
  price: string | null;
  currency: string | null;
  quantityAvailable: number | null;
  publicationUrl: string | null;
  isAvailable: boolean;
  capturedAt: Date;
};

export type ProductComboComponent = {
  productId: string;
  containsProductId: string;
  quantity: number;
  averageSellingPrice: string | null;
};

export type HistoricalSellingPrice = {
  productId: string;
  averageSellingPrice: string;
};

export class OpportunitiesRepository {
  constructor(private readonly database?: DatabaseClient) {}

  private get client(): DatabaseClient {
    return this.database ?? getDatabase();
  }

  /**
   * PostgreSQL DISTINCT ON selects one snapshot per product without issuing a query per product.
   * The id ordering makes simultaneous captures deterministic.
   */
  async findProductsWithCurrentOffers(): Promise<CurrentProductOffer[]> {
    return this.client
      .selectDistinctOn([productBestOfferHistory.productId], {
        productId: products.id,
        name: products.name,
        shortName: products.shortName,
        iconUrl: products.iconUrl,
        imageKey: products.imageKey,
        averageSellingPrice: products.averageSellingPrice,
        price: productBestOfferHistory.price,
        currency: productBestOfferHistory.currency,
        quantityAvailable: productBestOfferHistory.quantityAvailable,
        publicationUrl: productBestOfferHistory.publicationUrl,
        isAvailable: productBestOfferHistory.isAvailable,
        capturedAt: productBestOfferHistory.capturedAt,
      })
      .from(productBestOfferHistory)
      .innerJoin(products, eq(products.id, productBestOfferHistory.productId))
      .where(
        exists(
          this.client
            .select({ id: publicationProducts.id })
            .from(publicationProducts)
            .where(eq(publicationProducts.productId, products.id)),
        ),
      )
      .orderBy(
        productBestOfferHistory.productId,
        desc(productBestOfferHistory.capturedAt),
        desc(productBestOfferHistory.id),
      );
  }

  async findComboComponents(): Promise<ProductComboComponent[]> {
    return this.client
      .select({
        productId: productCombos.productId,
        containsProductId: productCombos.containsProductId,
        quantity: productCombos.quantity,
        averageSellingPrice: products.averageSellingPrice,
      })
      .from(productCombos)
      .innerJoin(products, eq(products.id, productCombos.containsProductId));
  }

  async findHistoricalSellingPrices(from?: Date): Promise<HistoricalSellingPrice[]> {
    return (
      this.client
        .select({
          productId: sales.productId,
          averageSellingPrice: sql<string>`avg(${sales.totalSalePrice})`,
        })
        .from(sales)
        // Combos always derive their historical price from their components.
        .leftJoin(productCombos, eq(productCombos.productId, sales.productId))
        .where(
          from
            ? sql`${isNull(productCombos.productId)} AND ${gte(sales.date, from)}`
            : isNull(productCombos.productId),
        )
        .groupBy(sales.productId)
    );
  }
}
