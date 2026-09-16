import { describe, expect, it } from 'vitest';
import request from 'supertest';

import {
  aliExpressPublicationImportSchema,
  type AliExpressPublicationImportInput,
} from '@alitracker/shared';

import { HttpError } from '../src/utils/http-error';
import { app } from '../src/app';
import { importAliExpressPublication } from '../src/modules/aliexpress-publication-import/aliexpress-publication-import.service';

const productIdOne = '9f98dbb8-99f6-4058-96f0-9577322cffdb';
const productIdTwo = '9ceaa3f1-6d2c-4405-8414-323045d94219';
const missingProductIdOne = '8d8c883c-7e36-4af0-a8b3-152b20c41f3c';
const missingProductIdTwo = '7c34ed17-303e-4a16-9620-5e8ffb8b0777';

const baseInput: AliExpressPublicationImportInput = aliExpressPublicationImportSchema.parse({
  store: {
    aliexpressStoreId: '1105347613',
    name: 'Tienda Marco Europa',
    location: 'España',
    reviewScore: 4.9,
    sales180d: '4,000+',
  },
  publication: {
    aliexpressProductId: '1005012470064491',
    name: 'DJI Lito X1',
    url: 'https://www.aliexpress.com/item/1005012470064491.html',
    salesCount: '97',
    reviewScore: 4.6,
    reviewCount: 10,
  },
  products: [
    {
      aliexpressSkuId: '12000058446755029',
      productId: productIdOne,
      quantityAvailable: 17,
      maxPurchase: 1,
    },
    {
      aliexpressSkuId: '12000058446755028',
      productId: productIdTwo,
      quantityAvailable: 1,
      maxPurchase: 1,
    },
  ],
});

type FakeStore = { id: string; aliexpressStoreId: bigint; name: string | null };
type FakePublication = { id: string; aliexpressProductId: bigint; storeId: string };
type FakePublicationProduct = { id: string; publicationId: string; productId: string; aliexpressSkuId: string };
type FakeRepository = {
  transaction<T>(operation: (transaction: FakeRepository) => Promise<T>): Promise<T>;
  findPublicationByAliExpressProductId(aliexpressProductId: string): Promise<FakePublication | undefined>;
  findExistingProductIds(productIds: string[]): Promise<{ id: string }[]>;
  findOrCreateStore(
    store: AliExpressPublicationImportInput['store'],
  ): Promise<{ store: FakeStore; created: boolean }>;
  createPublication(
    storeId: string,
    publication: AliExpressPublicationImportInput['publication'],
  ): Promise<FakePublication>;
  createPublicationProducts(
    publicationId: string,
    products: AliExpressPublicationImportInput['products'],
  ): Promise<FakePublicationProduct[]>;
};

function createRepository({
  productIds = [productIdOne, productIdTwo],
  stores = [] as FakeStore[],
  publications = [] as FakePublication[],
  failPublicationProducts = false,
}: {
  productIds?: string[];
  stores?: FakeStore[];
  publications?: FakePublication[];
  failPublicationProducts?: boolean;
} = {}) {
  const state = {
    stores: [...stores],
    publications: [...publications],
    publicationProducts: [] as FakePublicationProduct[],
  };

  const repository: FakeRepository = {
    transaction: async <T>(operation: (transaction: FakeRepository) => Promise<T>) => {
      const snapshot = {
        stores: [...state.stores],
        publications: [...state.publications],
        publicationProducts: [...state.publicationProducts],
      };
      try {
        return await operation(repository);
      } catch (error) {
        state.stores = snapshot.stores;
        state.publications = snapshot.publications;
        state.publicationProducts = snapshot.publicationProducts;
        throw error;
      }
    },
    findPublicationByAliExpressProductId: async (aliexpressProductId: string) =>
      state.publications.find(
        (publication) => publication.aliexpressProductId === BigInt(aliexpressProductId),
      ),
    findExistingProductIds: async (requestedProductIds: string[]) =>
      requestedProductIds.filter((id) => productIds.includes(id)).map((id) => ({ id })),
    findOrCreateStore: async (store: AliExpressPublicationImportInput['store']) => {
      const existing = state.stores.find(
        (candidate) => candidate.aliexpressStoreId === BigInt(store.aliexpressStoreId),
      );
      if (existing) {
        if (store.name !== null) existing.name = store.name;
        return { store: existing, created: false };
      }

      const created = {
        id: `store-${state.stores.length + 1}`,
        aliexpressStoreId: BigInt(store.aliexpressStoreId),
        name: store.name,
      };
      state.stores.push(created);
      return { store: created, created: true };
    },
    createPublication: async (storeId: string, publication: AliExpressPublicationImportInput['publication']) => {
      const created = {
        id: `publication-${state.publications.length + 1}`,
        storeId,
        aliexpressProductId: BigInt(publication.aliexpressProductId),
      };
      state.publications.push(created);
      return created;
    },
    createPublicationProducts: async (
      publicationId: string,
      products: AliExpressPublicationImportInput['products'],
    ) => {
      const created = products.map((product, index) => ({
        id: `publication-product-${state.publicationProducts.length + index + 1}`,
        publicationId,
        productId: product.productId,
        aliexpressSkuId: product.aliexpressSkuId,
      }));
      state.publicationProducts.push(...created);
      if (failPublicationProducts) throw new Error('insert failed');
      return created;
    },
  };

  return { state, repository };
}

async function expectImportError(
  input: AliExpressPublicationImportInput,
  repository: ReturnType<typeof createRepository>['repository'],
  code: string,
) {
  await expect(importAliExpressPublication(input, repository as never)).rejects.toMatchObject({
    code,
  } satisfies Partial<HttpError>);
}

describe('importAliExpressPublication', () => {
  it('returns INVALID_REQUEST for a malformed import payload before accessing the database', async () => {
    const response = await request(app).post('/api/aliexpress/publications').send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'La petición de importación no es válida.',
    });
  });

  it('creates a store, publication, and multiple publication products atomically', async () => {
    const { repository, state } = createRepository();

    await expect(importAliExpressPublication(baseInput, repository as never)).resolves.toEqual({
      success: true,
      message: 'Publicación importada correctamente.',
      store: { id: 'store-1', aliexpressStoreId: '1105347613', created: true },
      publication: { id: 'publication-1', aliexpressProductId: '1005012470064491' },
      publicationProducts: [
        {
          id: 'publication-product-1',
          aliexpressSkuId: '12000058446755029',
          productId: productIdOne,
        },
        {
          id: 'publication-product-2',
          aliexpressSkuId: '12000058446755028',
          productId: productIdTwo,
        },
      ],
    });
    expect(state.publicationProducts).toHaveLength(2);
  });

  it('reuses and updates an existing store for a new publication', async () => {
    const { repository, state } = createRepository({
      stores: [{ id: 'store-existing', aliexpressStoreId: 1105347613n, name: 'Nombre antiguo' }],
    });

    const result = await importAliExpressPublication(baseInput, repository as never);

    expect(result.store).toEqual({
      id: 'store-existing',
      aliexpressStoreId: '1105347613',
      created: false,
    });
    expect(state.stores).toHaveLength(1);
    expect(state.stores[0]?.name).toBe('Tienda Marco Europa');
  });

  it('rejects an existing publication without changing the store', async () => {
    const { repository, state } = createRepository({
      publications: [
        { id: 'publication-existing', aliexpressProductId: 1005012470064491n, storeId: 'store-1' },
      ],
    });

    await expectImportError(baseInput, repository, 'PUBLICATION_ALREADY_EXISTS');
    expect(state.stores).toHaveLength(0);
    expect(state.publicationProducts).toHaveLength(0);
  });

  it('normalizes a concurrent publication unique violation as a conflict', async () => {
    const { repository, state } = createRepository();
    repository.createPublication = async () => {
      throw { code: '23505', constraint: 'publications_aliexpress_product_id_key' };
    };

    await expectImportError(baseInput, repository, 'PUBLICATION_ALREADY_EXISTS');
    expect(state.stores).toHaveLength(0);
  });

  it('reports a missing internal product without saving anything', async () => {
    const { repository, state } = createRepository({ productIds: [productIdOne] });

    await expectImportError(baseInput, repository, 'PRODUCTS_NOT_FOUND');
    expect(state.stores).toHaveLength(0);
    expect(state.publications).toHaveLength(0);
  });

  it('reports every missing internal product', async () => {
    const { repository } = createRepository({ productIds: [] });
    const input = {
      ...baseInput,
      products: [
        { ...baseInput.products[0]!, productId: missingProductIdOne },
        { ...baseInput.products[1]!, productId: missingProductIdTwo },
      ],
    } satisfies AliExpressPublicationImportInput;

    await expect(importAliExpressPublication(input, repository as never)).rejects.toMatchObject({
      code: 'PRODUCTS_NOT_FOUND',
      details: { missingProductIds: [missingProductIdOne, missingProductIdTwo] },
    });
  });

  it('rejects duplicate SKUs before opening a transaction', async () => {
    const { repository, state } = createRepository();
    const input = {
      ...baseInput,
      products: [baseInput.products[0]!, { ...baseInput.products[1]!, aliexpressSkuId: '12000058446755029' }],
    } satisfies AliExpressPublicationImportInput;

    await expectImportError(input, repository, 'DUPLICATE_SKUS');
    expect(state.stores).toHaveLength(0);
  });

  it('rolls back the store and publication when publication product insertion fails', async () => {
    const { repository, state } = createRepository({ failPublicationProducts: true });

    await expect(importAliExpressPublication(baseInput, repository as never)).rejects.toThrow('insert failed');
    expect(state.stores).toHaveLength(0);
    expect(state.publications).toHaveLength(0);
    expect(state.publicationProducts).toHaveLength(0);
  });

  it('preserves large SKU IDs as strings', async () => {
    const { repository } = createRepository();

    const result = await importAliExpressPublication(baseInput, repository as never);

    expect(result.publicationProducts[0]?.aliexpressSkuId).toBe('12000058446755029');
  });

  it('does not duplicate a store across imports for the same AliExpress store', async () => {
    const { repository, state } = createRepository();
    await importAliExpressPublication(baseInput, repository as never);
    await importAliExpressPublication(
      {
        ...baseInput,
        publication: { ...baseInput.publication, aliexpressProductId: '1005012470064492' },
        products: [
          { ...baseInput.products[0]!, aliexpressSkuId: '12000058446755030' },
          { ...baseInput.products[1]!, aliexpressSkuId: '12000058446755031' },
        ],
      },
      repository as never,
    );

    expect(state.stores).toHaveLength(1);
    expect(state.publications).toHaveLength(2);
  });
});
