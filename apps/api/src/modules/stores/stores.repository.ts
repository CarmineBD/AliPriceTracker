import { asc, desc, eq, sql } from 'drizzle-orm';

import { getDatabase } from '../../db/client';
import { publicationProducts, publications, stores } from '../../db/schema/aliexpress-publications';
import { products } from '../../db/schema/products';

export class StoresRepository {
  async findAll() {
    const publicationsCount = sql<number>`count(${publications.id})::int`.as('publications_count');

    return getDatabase()
      .select({
        id: stores.id,
        aliexpressStoreId: stores.aliexpressStoreId,
        name: stores.name,
        location: stores.location,
        reviewScore: stores.reviewScore,
        sales180d: stores.sales180d,
        publicationsCount,
      })
      .from(stores)
      .leftJoin(publications, eq(publications.storeId, stores.id))
      .groupBy(stores.id)
      .orderBy(asc(stores.name), asc(stores.createdAt));
  }

  async findByIdWithPublications(id: string) {
    const database = getDatabase();
    const [store] = await database.select().from(stores).where(eq(stores.id, id));

    if (!store) {
      return undefined;
    }

    const publicationRows = await database
      .select({
        publicationId: publications.id,
        publicationAliexpressProductId: publications.aliexpressProductId,
        publicationName: publications.name,
        publicationUrl: publications.url,
        publicationSalesCount: publications.salesCount,
        publicationReviewScore: publications.reviewScore,
        publicationReviewCount: publications.reviewCount,
        publicationProductId: publicationProducts.id,
        productId: publicationProducts.productId,
        productName: products.name,
        productShortName: products.shortName,
        aliexpressSkuId: publicationProducts.aliexpressSkuId,
        price: publicationProducts.price,
        currency: publicationProducts.currency,
        quantityAvailable: publicationProducts.quantityAvailable,
        maxPurchase: publicationProducts.maxPurchase,
      })
      .from(publications)
      .leftJoin(publicationProducts, eq(publicationProducts.publicationId, publications.id))
      .leftJoin(products, eq(products.id, publicationProducts.productId))
      .where(eq(publications.storeId, id))
      .orderBy(desc(publications.createdAt), asc(publicationProducts.createdAt));

    return { store, publicationRows };
  }
}
