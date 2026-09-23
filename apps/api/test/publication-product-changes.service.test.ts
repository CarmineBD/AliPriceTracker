import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { app } from '../src/app.js';
import type { PublicationProductChangeRow } from '../src/modules/publication-product-changes/publication-product-changes.repository.js';
import { listPublicationProductChanges } from '../src/modules/publication-product-changes/publication-product-changes.service.js';

const productId = '0f4c9a9a-1fd9-45c1-978d-4f08023c96f1';
const publicationProductId = 'af8f3a4a-6f92-4ef5-8e9e-8ea77b668eed';

const priceChange: PublicationProductChangeRow = {
  historyId: 'fa02f523-6d7a-4b35-9b9a-1bc59a5c5442',
  publicationProductId,
  changeType: 'price',
  previousPrice: '19.99',
  currentPrice: '17.49',
  previousCurrency: 'EUR',
  currentCurrency: 'EUR',
  previousQuantityAvailable: 20,
  currentQuantityAvailable: 20,
  changedAt: '2026-09-19T10:30:00.000Z',
  productId,
  productName: 'Producto de prueba',
  productShortName: 'Prueba',
  productImageKey: null,
  productIconUrl: 'https://example.com/product.png',
  storeName: 'Tienda de prueba',
  publicationUrl: 'https://example.com/publication',
};

describe('listPublicationProductChanges', () => {
  it('maps a price change with the previous and current price', async () => {
    const repository = {
      findPage: vi.fn().mockResolvedValue({ changes: [priceChange], total: 2 }),
    };

    const result = await listPublicationProductChanges(
      { page: 2, pageSize: 1, changeType: 'price' },
      repository,
    );

    expect(repository.findPage).toHaveBeenCalledWith({ page: 2, pageSize: 1, changeType: 'price' });
    expect(result).toEqual({
      changes: [
        {
          historyId: priceChange.historyId,
          publicationProductId,
          changeType: 'price',
          previousValue: '19.99',
          currentValue: '17.49',
          previousCurrency: 'EUR',
          currentCurrency: 'EUR',
          product: {
            id: productId,
            name: 'Producto de prueba',
            shortName: 'Prueba',
            imageUrl: 'https://example.com/product.png',
          },
          storeName: 'Tienda de prueba',
          publicationUrl: 'https://example.com/publication',
          changedAt: '2026-09-19T10:30:00.000Z',
        },
      ],
      pagination: { page: 2, pageSize: 1, total: 2, totalPages: 2 },
    });
  });

  it('maps a stock change with numeric values', async () => {
    const result = await listPublicationProductChanges(
      { page: 1, pageSize: 20, changeType: 'stock' },
      {
        findPage: async () => ({
          changes: [
            {
              ...priceChange,
              changeType: 'stock',
              previousQuantityAvailable: 20,
              currentQuantityAvailable: 8,
            },
          ],
          total: 1,
        }),
      },
    );

    expect(result.changes[0]).toMatchObject({
      changeType: 'stock',
      previousValue: 20,
      currentValue: 8,
    });
    expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
  });
});

describe('publication product changes request validation', () => {
  it('validates pagination before accessing the database', async () => {
    expect((await request(app).get('/api/publication-product-changes?page=0')).status).toBe(400);
    expect((await request(app).get('/api/publication-product-changes?pageSize=101')).status).toBe(
      400,
    );
    expect((await request(app).get('/api/publication-product-changes?unknown=true')).status).toBe(
      400,
    );
    expect(
      (await request(app).get('/api/publication-product-changes?changeType=invalid')).status,
    ).toBe(400);
  });
});
