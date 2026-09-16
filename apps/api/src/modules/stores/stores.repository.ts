import { asc, eq, sql } from 'drizzle-orm';

import { getDatabase } from '../../db/client';
import { publications, stores } from '../../db/schema/aliexpress-publications';

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
}
