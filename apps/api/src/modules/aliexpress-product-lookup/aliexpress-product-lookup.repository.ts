import { and, eq, inArray } from 'drizzle-orm';

import { getDatabase } from '../../db/client';
import { publicationProducts, publications } from '../../db/schema/aliexpress-publications';

export class AliExpressProductLookupRepository {
  async findImportedSkuIds(aliexpressProductId: string, skuIds: string[]) {
    if (skuIds.length === 0) {
      return new Map<string, string>();
    }

    const rows = await getDatabase()
      .select({
        aliexpressSkuId: publicationProducts.aliexpressSkuId,
        productId: publicationProducts.productId,
      })
      .from(publicationProducts)
      .innerJoin(publications, eq(publicationProducts.publicationId, publications.id))
      .where(
        and(
          eq(publications.aliexpressProductId, BigInt(aliexpressProductId)),
          inArray(publicationProducts.aliexpressSkuId, skuIds),
        ),
      );

    return new Map(rows.map((row) => [row.aliexpressSkuId, row.productId]));
  }
}
