import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { app } from '../src/app';
import {
  chooseBestOffer,
  getProductBestOfferHistory,
  refreshProductBestOffers,
} from '../src/modules/product-best-offer/product-best-offer.service';

const productId = '9f7d2e8f-1781-411a-b74a-7923d9a83ea1';
const offer = (
  id: string,
  price: string | null,
  quantityAvailable: number | null,
  currency = 'EUR',
) => ({
  publicationProductId: id,
  price,
  currency,
  quantityAvailable,
  publicationUrl: `https://example.com/${id}`,
});

describe('chooseBestOffer', () => {
  it('chooses the lower price, then greater stock, then the stable publication product id', () => {
    expect(chooseBestOffer([offer('b', '200.00', 5), offer('a', '190.00', 1)])).toMatchObject({
      publicationProductId: 'a',
    });
    expect(chooseBestOffer([offer('a', '200.00', 5), offer('b', '200.00', 20)])).toMatchObject({
      publicationProductId: 'b',
    });
    expect(chooseBestOffer([offer('b', '200.00', 20), offer('a', '200.00', 20)])).toMatchObject({
      publicationProductId: 'a',
    });
  });

  it('excludes zero and unknown stock, records unavailable, and refuses mixed currencies', () => {
    expect(chooseBestOffer([offer('a', '100.00', 0), offer('b', '90.00', null)])).toMatchObject({
      isAvailable: false,
    });
    expect(chooseBestOffer([offer('a', '100.00', 1, 'EUR'), offer('b', '90.00', 1, 'USD')])).toBe(
      'currency-mismatch',
    );
  });
});

describe('refreshProductBestOffers', () => {
  it('inserts the initial best offer and only evaluates products fully refreshed in this run', async () => {
    const saveIfChanged = vi.fn().mockResolvedValue('initial');
    const logger = { warn: vi.fn() };
    const result = await refreshProductBestOffers(
      { refreshedPublicationProductIds: ['a', 'b'], capturedAt: new Date('2026-09-20T10:00:00Z') },
      {
        findProductOffers: async () =>
          new Map([
            [productId, [offer('a', '200.00', 5), offer('b', '190.00', 2)]],
            ['other', [offer('c', '100.00', 1)]],
          ]),
        saveIfChanged,
      },
      logger,
    );
    expect(saveIfChanged).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({ publicationProductId: 'b' }),
      expect.any(Date),
    );
    expect(result).toMatchObject({
      productsEvaluated: 1,
      initialSnapshots: 1,
      skippedIncompleteRefresh: 1,
    });
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('counts stock-only and winner-only changes through repository results without duplicating unchanged states', async () => {
    const saveIfChanged = vi
      .fn()
      .mockResolvedValueOnce('changed')
      .mockResolvedValueOnce('unchanged');
    const repository = {
      findProductOffers: async () => new Map([[productId, [offer('a', '200.00', 3)]]]),
      saveIfChanged,
    };
    const first = await refreshProductBestOffers(
      { refreshedPublicationProductIds: ['a'], capturedAt: new Date() },
      repository,
    );
    const second = await refreshProductBestOffers(
      { refreshedPublicationProductIds: ['a'], capturedAt: new Date() },
      repository,
    );
    expect(first.changed).toBe(1);
    expect(second.unchanged).toBe(1);
  });
});

describe('getProductBestOfferHistory', () => {
  const entry = {
    id: '1f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
    productId,
    publicationProductId: '2f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
    price: '190.00',
    currency: 'EUR',
    quantityAvailable: 10,
    publicationUrl: 'https://example.com/a',
    isAvailable: true,
    capturedAt: new Date('2026-09-20T10:00:00.000Z'),
  };
  const historyRepository = {
    findProduct: vi.fn().mockResolvedValue({ id: productId, name: 'DJI Neo 2' }),
    findHistory: vi.fn().mockResolvedValue([entry]),
    findBaseline: vi.fn().mockResolvedValue(entry),
    findCurrent: vi.fn().mockResolvedValue(entry),
  };

  it('returns current, chronological history and a baseline preceding from', async () => {
    const from = new Date('2026-09-19T00:00:00.000Z');
    const result = await getProductBestOfferHistory(productId, { from }, historyRepository);
    expect(result.current).toMatchObject({ price: '190.00' });
    expect(result.baseline).toMatchObject({ capturedAt: '2026-09-20T10:00:00.000Z' });
    expect(historyRepository.findBaseline).toHaveBeenCalledWith(productId, from);
  });

  it('rejects missing products and inverted ranges', async () => {
    await expect(
      getProductBestOfferHistory(
        productId,
        {},
        { ...historyRepository, findProduct: async () => undefined },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      getProductBestOfferHistory(
        productId,
        { from: new Date('2026-09-21'), to: new Date('2026-09-20') },
        historyRepository,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('product best offer history request validation', () => {
  it('returns 400 for invalid timestamps and inverted ranges', async () => {
    expect(
      (await request(app).get(`/api/products/${productId}/best-offer-history?from=not-a-date`))
        .status,
    ).toBe(400);
    expect(
      (
        await request(app).get(
          `/api/products/${productId}/best-offer-history?from=2026-09-21T00:00:00.000Z&to=2026-09-20T00:00:00.000Z`,
        )
      ).status,
    ).toBe(400);
  });
});
