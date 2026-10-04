import { and, asc, desc, eq, gt, gte, isNotNull, isNull, sql } from 'drizzle-orm';

import { getDatabase } from '../../db/client.js';
import {
  publicationProducts,
  publications,
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
   * PostgreSQL DISTINCT ON selects the cheapest currently purchasable publication per product.
   * Opportunities must use current publication data rather than the best-offer history snapshot,
   * which can be stale while a tracker refresh is incomplete.
   */
  async findProductsWithCurrentOffers(): Promise<CurrentProductOffer[]> {
    return this.client
      .selectDistinctOn([publicationProducts.productId], {
        productId: products.id,
        name: products.name,
        shortName: products.shortName,
        iconUrl: products.iconUrl,
        imageKey: products.imageKey,
        averageSellingPrice: products.averageSellingPrice,
        price: publicationProducts.price,
        currency: publicationProducts.currency,
        quantityAvailable: publicationProducts.quantityAvailable,
        publicationUrl: publications.url,
        isAvailable: sql<boolean>`true`,
        capturedAt: publicationProducts.updatedAt,
      })
      .from(publicationProducts)
      .innerJoin(products, eq(products.id, publicationProducts.productId))
      .innerJoin(publications, eq(publications.id, publicationProducts.publicationId))
      .where(
        and(isNotNull(publicationProducts.price), gt(publicationProducts.quantityAvailable, 0)),
      )
      .orderBy(
        publicationProducts.productId,
        asc(publicationProducts.price),
        desc(publicationProducts.quantityAvailable),
        asc(publicationProducts.id),
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
