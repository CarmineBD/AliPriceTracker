import { asc, eq, inArray } from 'drizzle-orm';

import { getDatabase } from '../../db/client';
import {
  publicationProductHistory,
  publicationProducts,
  publications,
} from '../../db/schema/aliexpress-publications';

export type TrackedPublicationProduct = {
  id: string;
  aliexpressSkuId: string;
  price: string | null;
  currency: string | null;
  quantityAvailable: number | null;
};

export type TrackedPublication = {
  id: string;
  aliexpressProductId: string;
  products: TrackedPublicationProduct[];
};

export type PublicationObservation = {
  publicationProductId: string;
  price: string | null;
  currency: string | null;
  quantityAvailable: number | null;
  updateCurrentState: boolean;
};

type DatabaseClient = ReturnType<typeof getDatabase>;

export class AliExpressTrackerRepository {
  constructor(private readonly database?: DatabaseClient) {}

  private get client(): DatabaseClient {
    return this.database ?? getDatabase();
  }

  async findPublications(): Promise<TrackedPublication[]> {
    const rows = await this.client
      .select({
        publicationId: publications.id,
        aliexpressProductId: publications.aliexpressProductId,
        publicationProductId: publicationProducts.id,
        aliexpressSkuId: publicationProducts.aliexpressSkuId,
        price: publicationProducts.price,
        currency: publicationProducts.currency,
        quantityAvailable: publicationProducts.quantityAvailable,
      })
      .from(publications)
      .leftJoin(publicationProducts, eq(publicationProducts.publicationId, publications.id))
      .orderBy(asc(publications.createdAt), asc(publicationProducts.createdAt));

    const publicationsById = new Map<string, TrackedPublication>();
    for (const row of rows) {
      let publication = publicationsById.get(row.publicationId);
      if (!publication) {
        publication = {
          id: row.publicationId,
          aliexpressProductId: row.aliexpressProductId.toString(),
          products: [],
        };
        publicationsById.set(row.publicationId, publication);
      }

      if (row.publicationProductId && row.aliexpressSkuId) {
        publication.products.push({
          id: row.publicationProductId,
          aliexpressSkuId: row.aliexpressSkuId,
          price: row.price,
          currency: row.currency,
          quantityAvailable: row.quantityAvailable,
        });
      }
    }

    return [...publicationsById.values()];
  }

  async findProductIdsWithHistory(publicationProductIds: string[]): Promise<Set<string>> {
    if (publicationProductIds.length === 0) {
      return new Set();
    }

    const rows = await this.client
      .selectDistinct({ publicationProductId: publicationProductHistory.publicationProductId })
      .from(publicationProductHistory)
      .where(inArray(publicationProductHistory.publicationProductId, publicationProductIds));

    return new Set(rows.map((row) => row.publicationProductId));
  }

  async savePublicationCheck({
    publicationId,
    capturedAt,
    observations,
  }: {
    publicationId: string;
    capturedAt: Date;
    observations: PublicationObservation[];
  }): Promise<void> {
    await this.client.transaction(async (transaction) => {
      if (observations.length > 0) {
        await transaction.insert(publicationProductHistory).values(
          observations.map((observation) => ({
            publicationProductId: observation.publicationProductId,
            price: observation.price,
            currency: observation.currency,
            quantityAvailable: observation.quantityAvailable,
            capturedAt,
          })),
        );
      }

      for (const observation of observations) {
        if (!observation.updateCurrentState) {
          continue;
        }

        await transaction
          .update(publicationProducts)
          .set({
            price: observation.price,
            currency: observation.currency,
            quantityAvailable: observation.quantityAvailable,
            updatedAt: capturedAt,
          })
          .where(eq(publicationProducts.id, observation.publicationProductId));
      }

      await transaction
        .update(publications)
        .set({ lastCheckedAt: capturedAt })
        .where(eq(publications.id, publicationId));
    });
  }
}
