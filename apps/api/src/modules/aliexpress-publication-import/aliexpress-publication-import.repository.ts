import { count, eq, inArray } from 'drizzle-orm';

import type { AliExpressPublicationImportInput } from '@alitracker/shared';

import { getDatabase } from '../../db/client';
import { publicationProducts, publications, stores } from '../../db/schema/aliexpress-publications';
import { products } from '../../db/schema/products';

type DatabaseClient = Pick<ReturnType<typeof getDatabase>, 'insert' | 'select' | 'update'>;
type StoreInput = AliExpressPublicationImportInput['store'];
type PublicationInput = AliExpressPublicationImportInput['publication'];
type PublicationProductInput = AliExpressPublicationImportInput['products'][number];

function toDatabaseAliExpressId(id: string): bigint {
  return BigInt(id);
}

export class AliExpressPublicationImportRepository {
  constructor(private readonly database?: DatabaseClient) {}

  private get client(): DatabaseClient {
    return this.database ?? getDatabase();
  }

  async transaction<T>(operation: (repository: AliExpressPublicationImportRepository) => Promise<T>) {
    return getDatabase().transaction(async (transaction) =>
      operation(new AliExpressPublicationImportRepository(transaction)),
    );
  }

  async findPublicationByAliExpressProductId(aliexpressProductId: string) {
    const [publication] = await this.client
      .select()
      .from(publications)
      .where(eq(publications.aliexpressProductId, toDatabaseAliExpressId(aliexpressProductId)));
    return publication;
  }

  async findExistingProductIds(productIds: string[]) {
    if (productIds.length === 0) {
      return [];
    }

    return this.client
      .select({ id: products.id })
      .from(products)
      .where(inArray(products.id, productIds));
  }

  async countByProductId(productId: string) {
    const [result] = await this.client
      .select({ total: count() })
      .from(publicationProducts)
      .where(eq(publicationProducts.productId, productId));
    return result?.total ?? 0;
  }

  async findStoreByAliExpressStoreId(aliexpressStoreId: string) {
    const [store] = await this.client
      .select()
      .from(stores)
      .where(eq(stores.aliexpressStoreId, toDatabaseAliExpressId(aliexpressStoreId)));
    return store;
  }

  async findOrCreateStore(input: StoreInput) {
    const existing = await this.findStoreByAliExpressStoreId(input.aliexpressStoreId);
    if (existing) {
      return { store: await this.updateStoreWhenProvided(existing.id, input), created: false };
    }

    const [createdStore] = await this.client
      .insert(stores)
      .values({
        aliexpressStoreId: toDatabaseAliExpressId(input.aliexpressStoreId),
        name: input.name,
        location: input.location,
        reviewScore: input.reviewScore === null ? null : String(input.reviewScore),
        sales180d: input.sales180d,
      })
      .onConflictDoNothing({ target: stores.aliexpressStoreId })
      .returning();

    if (createdStore) {
      return { store: createdStore, created: true };
    }

    const concurrentStore = await this.findStoreByAliExpressStoreId(input.aliexpressStoreId);
    if (!concurrentStore) {
      throw new Error('Store creation did not return a store.');
    }

    return {
      store: await this.updateStoreWhenProvided(concurrentStore.id, input),
      created: false,
    };
  }

  private async updateStoreWhenProvided(storeId: string, input: StoreInput) {
    const values: {
      name?: string;
      location?: string;
      reviewScore?: string;
      sales180d?: string;
      updatedAt?: Date;
    } = {};

    if (input.name !== null) values.name = input.name;
    if (input.location !== null) values.location = input.location;
    if (input.reviewScore !== null) values.reviewScore = String(input.reviewScore);
    if (input.sales180d !== null) values.sales180d = input.sales180d;

    if (Object.keys(values).length === 0) {
      const store = await this.findStoreById(storeId);
      if (!store) throw new Error('Store was not found after lookup.');
      return store;
    }

    values.updatedAt = new Date();
    const [store] = await this.client
      .update(stores)
      .set(values)
      .where(eq(stores.id, storeId))
      .returning();
    if (!store) throw new Error('Store update did not return a store.');
    return store;
  }

  private async findStoreById(id: string) {
    const [store] = await this.client.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async createPublication(storeId: string, input: PublicationInput) {
    const [publication] = await this.client
      .insert(publications)
      .values({
        storeId,
        aliexpressProductId: toDatabaseAliExpressId(input.aliexpressProductId),
        name: input.name,
        url: input.url,
        salesCount: input.salesCount,
        reviewScore: input.reviewScore === null ? null : String(input.reviewScore),
        reviewCount: input.reviewCount,
      })
      .returning();
    if (!publication) throw new Error('Publication creation did not return a publication.');
    return publication;
  }

  async createPublicationProducts(publicationId: string, inputs: PublicationProductInput[]) {
    return this.client
      .insert(publicationProducts)
      .values(
        inputs.map((input) => ({
          publicationId,
          productId: input.productId,
          aliexpressSkuId: input.aliexpressSkuId,
          quantityAvailable: input.quantityAvailable,
          maxPurchase: input.maxPurchase,
        })),
      )
      .returning();
  }
}
