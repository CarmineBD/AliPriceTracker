import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { app } from '../src/app';
import type {
  PublicationProductHistoryEntry,
  PublicationProductHistoryFilters,
} from '../src/modules/publication-product-history/publication-product-history.repository';
import { getPublicationProductHistory } from '../src/modules/publication-product-history/publication-product-history.service';

const publicationProductId = '2f77ec40-2d60-4a7e-a0cf-d93a4728b1de';
const parent = {
  id: publicationProductId,
  publicationId: '9ceaa3f1-6d2c-4405-8414-323045d94219',
  productId: '9f7d2e8f-1781-411a-b74a-7923d9a83ea1',
  aliexpressSkuId: '12000058446755029',
  price: '250.00',
  currency: 'EUR',
  quantityAvailable: 15,
  lastCheckedAt: new Date('2026-09-20T11:00:00.000Z'),
};

const entries: PublicationProductHistoryEntry[] = [
  {
    id: 'history-1',
    price: '300.00',
    currency: 'EUR',
    quantityAvailable: 20,
    capturedAt: new Date('2026-09-01T10:00:00.000Z'),
  },
  {
    id: 'history-2',
    price: '280.00',
    currency: 'EUR',
    quantityAvailable: 20,
    capturedAt: new Date('2026-09-10T10:00:00.000Z'),
  },
  {
    id: 'history-3',
    price: '250.00',
    currency: 'EUR',
    quantityAvailable: 15,
    capturedAt: new Date('2026-09-20T10:00:00.000Z'),
  },
];

function createRepository({
  publicationProduct = parent,
  history = entries,
  baseline = entries[1],
}: {
  publicationProduct?: typeof parent | undefined;
  history?: PublicationProductHistoryEntry[];
  baseline?: PublicationProductHistoryEntry | undefined;
} = {}) {
  return {
    findPublicationProduct: vi.fn().mockResolvedValue(publicationProduct),
    findHistory: vi.fn().mockResolvedValue(history),
    findBaseline: vi.fn().mockResolvedValue(baseline),
  };
}

describe('getPublicationProductHistory', () => {
  it('returns all history in chronological order without filters', async () => {
    const repository = createRepository();

    const result = await getPublicationProductHistory(publicationProductId, {}, repository);

    expect(repository.findHistory).toHaveBeenCalledWith(publicationProductId, {});
    expect(result.baseline).toBeNull();
    expect(result.history.map((entry) => entry.id)).toEqual([
      'history-1',
      'history-2',
      'history-3',
    ]);
    expect(result.publicationProduct).toMatchObject({
      id: publicationProductId,
      current: { price: '250.00', currency: 'EUR', quantityAvailable: 15 },
      lastCheckedAt: '2026-09-20T11:00:00.000Z',
    });
  });

  it('passes from to the repository and returns the preceding baseline', async () => {
    const repository = createRepository({ history: [entries[2]!], baseline: entries[1] });
    const filters: PublicationProductHistoryFilters = {
      from: new Date('2026-09-15T00:00:00.000Z'),
    };

    const result = await getPublicationProductHistory(publicationProductId, filters, repository);

    expect(repository.findHistory).toHaveBeenCalledWith(publicationProductId, filters);
    expect(repository.findBaseline).toHaveBeenCalledWith(publicationProductId, filters.from);
    expect(result.baseline).toMatchObject({ id: 'history-2', price: '280.00' });
    expect(result.history).toHaveLength(1);
  });

  it('passes to to the repository without requesting a baseline', async () => {
    const repository = createRepository({ history: entries.slice(0, 2) });
    const filters: PublicationProductHistoryFilters = { to: new Date('2026-09-15T00:00:00.000Z') };

    const result = await getPublicationProductHistory(publicationProductId, filters, repository);

    expect(repository.findHistory).toHaveBeenCalledWith(publicationProductId, filters);
    expect(repository.findBaseline).not.toHaveBeenCalled();
    expect(result.history.map((entry) => entry.id)).toEqual(['history-1', 'history-2']);
  });

  it('passes both bounds to the repository', async () => {
    const repository = createRepository({
      history: [entries[1]!, entries[2]!],
      baseline: entries[0],
    });
    const filters: PublicationProductHistoryFilters = {
      from: new Date('2026-09-05T00:00:00.000Z'),
      to: new Date('2026-09-20T10:00:00.000Z'),
    };

    const result = await getPublicationProductHistory(publicationProductId, filters, repository);

    expect(repository.findHistory).toHaveBeenCalledWith(publicationProductId, filters);
    expect(result.history.map((entry) => entry.id)).toEqual(['history-2', 'history-3']);
    expect(result.baseline).toMatchObject({ id: 'history-1' });
  });

  it('returns a null baseline when no earlier history exists', async () => {
    const repository = createRepository({ history: [entries[0]!] });
    repository.findBaseline.mockResolvedValue(undefined);

    const result = await getPublicationProductHistory(
      publicationProductId,
      { from: new Date('2026-09-01T00:00:00.000Z') },
      repository,
    );

    expect(result.baseline).toBeNull();
  });

  it('returns 404 when the publication product does not exist', async () => {
    const repository = createRepository();
    repository.findPublicationProduct.mockResolvedValue(undefined);

    await expect(
      getPublicationProductHistory(publicationProductId, {}, repository),
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('rejects an inverted range before querying the repository', async () => {
    const repository = createRepository();

    await expect(
      getPublicationProductHistory(
        publicationProductId,
        { from: new Date('2026-09-20T00:00:00.000Z'), to: new Date('2026-09-01T00:00:00.000Z') },
        repository,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(repository.findPublicationProduct).not.toHaveBeenCalled();
  });
});

describe('publication product history request validation', () => {
  it('returns 400 for invalid timestamps', async () => {
    const response = await request(app).get(
      `/api/publication-products/${publicationProductId}/history?from=not-a-date`,
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  it('returns 400 when from is later than to', async () => {
    const response = await request(app).get(
      `/api/publication-products/${publicationProductId}/history?from=2026-09-20T00:00:00.000Z&to=2026-09-01T00:00:00.000Z`,
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });
});
