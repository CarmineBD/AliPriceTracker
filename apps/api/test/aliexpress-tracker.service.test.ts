import { describe, expect, it, vi } from 'vitest';

import type {
  AliExpressProductResponse,
  AliExpressProductResult,
} from '../src/modules/aliexpress-client/aliexpress-client';
import type {
  PublicationObservation,
  TrackedPublication,
} from '../src/modules/aliexpress-tracker/aliexpress-tracker.repository';
import { trackAllAliExpressPublications } from '../src/modules/aliexpress-tracker/aliexpress-tracker.service';

const publicationProduct = {
  id: 'publication-product-1',
  aliexpressSkuId: 'sku-a',
  price: '299.00',
  currency: 'EUR',
  quantityAvailable: 20,
};

function publication(
  id: string,
  aliexpressProductId: string,
  products = [publicationProduct],
): TrackedPublication {
  return { id, aliexpressProductId, products };
}

function upstreamProduct(
  overrides: Partial<AliExpressProductResponse['products'][number]> = {},
): AliExpressProductResponse['products'][number] {
  return {
    aliexpressSkuId: 'sku-a',
    variantName: 'Variant A',
    price: '299,00 €',
    priceAmount: 299,
    currency: 'EUR',
    quantityAvailable: 20,
    maxPurchase: 1,
    imageUrl: null,
    salable: true,
    ...overrides,
  };
}

function successfulResult(
  products: AliExpressProductResponse['products'] = [upstreamProduct()],
): AliExpressProductResult {
  return {
    status: 200,
    body: {
      success: true,
      mtopRet: ['SUCCESS::ok'],
      productId: '1001',
      productName: 'Publication',
      skuCount: products.length,
      skuPrices: [],
      store: null,
      publication: null,
      products,
      errorType: null,
      errorCode: null,
      upstreamStatus: 200,
      session: null,
    },
  };
}

function failedResult(): AliExpressProductResult {
  return {
    status: 502,
    body: {
      success: false,
      mtopRet: null,
      productId: '1001',
      productName: null,
      skuCount: 0,
      skuPrices: [],
      store: null,
      publication: null,
      products: [],
      errorType: 'upstream',
      errorCode: null,
      upstreamStatus: 502,
      session: null,
    },
  };
}

function userValidationResult(): AliExpressProductResult {
  return {
    status: 502,
    body: {
      success: false,
      mtopRet: ['FAIL_SYS_USER_VALIDATE', 'RGV587_ERROR::SM::Retry later'],
      productId: '1001',
      productName: null,
      skuCount: 0,
      skuPrices: [],
      store: null,
      publication: null,
      products: [],
      errorType: 'reauth',
      errorCode: 'ALIEXPRESS_SESSION_REAUTH_REQUIRED',
      upstreamStatus: 200,
      session: null,
    },
  };
}

function createRepository(publications: TrackedPublication[], historyProductIds: string[] = []) {
  const historyIds = new Set(historyProductIds);
  const saved: Array<{
    publicationId: string;
    capturedAt: Date;
    observations: PublicationObservation[];
  }> = [];

  return {
    saved,
    repository: {
      findPublications: async () => publications,
      findProductIdsWithHistory: async (publicationProductIds: string[]) =>
        new Set(publicationProductIds.filter((id) => historyIds.has(id))),
      savePublicationCheck: async (input: {
        publicationId: string;
        capturedAt: Date;
        observations: PublicationObservation[];
      }) => {
        saved.push(input);
      },
    },
  };
}

function createLogger() {
  return { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
}

describe('trackAllAliExpressPublications', () => {
  it('creates an initial snapshot when the current state has no history', async () => {
    const { repository, saved } = createRepository([publication('publication-1', '1001')]);

    const result = await trackAllAliExpressPublications({
      repository,
      aliexpressClient: { getProduct: async () => successfulResult() },
      delayMilliseconds: 0,
      logger: createLogger(),
    });

    expect(result.products).toMatchObject({ initialSnapshots: 1, changed: 0, unchanged: 0 });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.observations).toEqual([
      {
        publicationProductId: 'publication-product-1',
        price: '299.00',
        currency: 'EUR',
        quantityAvailable: 20,
        updateCurrentState: false,
      },
    ]);
  });

  it('does not create history when an existing snapshot and current state are unchanged', async () => {
    const { repository, saved } = createRepository(
      [publication('publication-1', '1001')],
      ['publication-product-1'],
    );

    const result = await trackAllAliExpressPublications({
      repository,
      aliexpressClient: { getProduct: async () => successfulResult() },
      delayMilliseconds: 0,
      logger: createLogger(),
    });

    expect(result.products).toMatchObject({ initialSnapshots: 0, changed: 0, unchanged: 1 });
    expect(saved[0]?.observations).toEqual([]);
  });

  it('records a price change and marks the current state for update', async () => {
    const { repository, saved } = createRepository(
      [publication('publication-1', '1001')],
      ['publication-product-1'],
    );

    const result = await trackAllAliExpressPublications({
      repository,
      aliexpressClient: {
        getProduct: async () =>
          successfulResult([upstreamProduct({ priceAmount: 279, price: '279,00 €' })]),
      },
      delayMilliseconds: 0,
      logger: createLogger(),
    });

    expect(result.products.changed).toBe(1);
    expect(saved[0]?.observations[0]).toMatchObject({ price: '279.00', updateCurrentState: true });
  });

  it('records a stock change and preserves an explicit zero quantity', async () => {
    const { repository, saved } = createRepository(
      [publication('publication-1', '1001')],
      ['publication-product-1'],
    );

    const result = await trackAllAliExpressPublications({
      repository,
      aliexpressClient: {
        getProduct: async () => successfulResult([upstreamProduct({ quantityAvailable: 0 })]),
      },
      delayMilliseconds: 0,
      logger: createLogger(),
    });

    expect(result.products.changed).toBe(1);
    expect(saved[0]?.observations[0]).toMatchObject({
      quantityAvailable: 0,
      updateCurrentState: true,
    });
  });

  it('ignores AliExpress SKUs that are not registered in the publication', async () => {
    const { repository, saved } = createRepository([publication('publication-1', '1001')]);

    const result = await trackAllAliExpressPublications({
      repository,
      aliexpressClient: {
        getProduct: async () =>
          successfulResult([
            upstreamProduct(),
            upstreamProduct({ aliexpressSkuId: 'untracked-sku', priceAmount: 1 }),
          ]),
      },
      delayMilliseconds: 0,
      logger: createLogger(),
    });

    expect(result.products.tracked).toBe(1);
    expect(saved[0]?.observations).toHaveLength(1);
    expect(saved[0]?.observations[0]?.publicationProductId).toBe('publication-product-1');
  });

  it('does not modify a registered SKU that is absent from AliExpress', async () => {
    const { repository, saved } = createRepository([publication('publication-1', '1001')]);
    const logger = createLogger();

    const result = await trackAllAliExpressPublications({
      repository,
      aliexpressClient: { getProduct: async () => successfulResult([]) },
      delayMilliseconds: 0,
      logger,
    });

    expect(result.products).toMatchObject({ missing: 1, initialSnapshots: 0 });
    expect(saved[0]?.observations).toEqual([]);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('continues with later publications after an individual publication error', async () => {
    const { repository, saved } = createRepository([
      publication('publication-1', '1001', []),
      publication('publication-2', '1002', []),
      publication('publication-3', '1003', []),
    ]);
    const requestedProductIds: string[] = [];
    const delay = vi.fn().mockResolvedValue(undefined);

    const result = await trackAllAliExpressPublications({
      repository,
      aliexpressClient: {
        getProduct: async (productId) => {
          requestedProductIds.push(productId);
          return productId === '1002' ? failedResult() : successfulResult([]);
        },
      },
      delay,
      delayMilliseconds: 0,
      logger: createLogger(),
    });

    expect(requestedProductIds).toEqual(['1001', '1002', '1003']);
    expect(result.publications).toEqual({ total: 3, processed: 2, failed: 1 });
    expect(saved).toHaveLength(2);
    expect(delay).toHaveBeenCalledTimes(2);
  });

  it('uses a three-second interval between successful publication requests by default', async () => {
    const { repository } = createRepository([
      publication('publication-1', '1001', []),
      publication('publication-2', '1002', []),
    ]);
    const delay = vi.fn().mockResolvedValue(undefined);

    await trackAllAliExpressPublications({
      repository,
      aliexpressClient: { getProduct: async () => successfulResult([]) },
      delay,
      logger: createLogger(),
      random: () => 0,
    });

    expect(delay).toHaveBeenCalledExactlyOnceWith(3_000);
  });

  it('adds positive jitter without reducing the three-second request interval', async () => {
    const { repository } = createRepository([
      publication('publication-1', '1001', []),
      publication('publication-2', '1002', []),
    ]);
    const delay = vi.fn().mockResolvedValue(undefined);

    await trackAllAliExpressPublications({
      repository,
      aliexpressClient: { getProduct: async () => successfulResult([]) },
      delay,
      random: () => 0.5,
      logger: createLogger(),
    });

    expect(delay).toHaveBeenCalledExactlyOnceWith(3_500);
  });

  it('retries a user-validation response with progressive delays before succeeding', async () => {
    const { repository, saved } = createRepository([publication('publication-1', '1001')]);
    const delay = vi.fn().mockResolvedValue(undefined);
    const logger = createLogger();
    const getProduct = vi
      .fn()
      .mockResolvedValueOnce(userValidationResult())
      .mockResolvedValueOnce(successfulResult());

    const result = await trackAllAliExpressPublications({
      repository,
      aliexpressClient: { getProduct },
      delay,
      userValidationRetryDelaysMilliseconds: [15_000, 30_000],
      random: () => 0,
      logger,
    });

    expect(result).toMatchObject({ aborted: false, publications: { processed: 1, failed: 0 } });
    expect(saved).toHaveLength(1);
    expect(delay).toHaveBeenCalledExactlyOnceWith(15_000);
    expect(getProduct).toHaveBeenCalledTimes(2);
    expect(JSON.parse(logger.warn.mock.calls[0]?.[0] as string)).toMatchObject({
      event: 'aliexpress_tracker_user_validation_retry',
      retryAttempt: 1,
      retryDelayMilliseconds: 15_000,
    });
  });

  it('logs an explicit anti-bot block and aborts after exhausting retries', async () => {
    const { repository } = createRepository([publication('publication-1', '1001')]);
    const delay = vi.fn().mockResolvedValue(undefined);
    const logger = createLogger();

    const result = await trackAllAliExpressPublications({
      repository,
      aliexpressClient: { getProduct: async () => userValidationResult() },
      delay,
      userValidationRetryDelaysMilliseconds: [15_000, 30_000],
      random: () => 0,
      logger,
    });

    expect(result).toMatchObject({ aborted: true, publications: { processed: 0, failed: 1 } });
    expect(delay).toHaveBeenNthCalledWith(1, 15_000);
    expect(delay).toHaveBeenNthCalledWith(2, 30_000);
    expect(JSON.parse(logger.error.mock.calls[0]?.[0] as string)).toMatchObject({
      event: 'aliexpress_tracker_user_validation_blocked',
      upstreamStatus: 200,
      mtopRet: ['FAIL_SYS_USER_VALIDATE', 'RGV587_ERROR::SM::Retry later'],
    });
  });
});
