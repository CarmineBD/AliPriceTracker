import { describe, expect, it } from 'vitest';

import { listAveragePrices } from '../src/modules/average-prices/average-prices.service.js';

describe('average prices service', () => {
  it('returns one entry per product with purchase or sale history', async () => {
    const result = await listAveragePrices({
      findSales: async () => [
        {
          productId: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
          imageKey: 'products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c/image.webp',
          shortName: 'Cámara',
          averagePrice: '18.125',
        },
      ],
      findPurchases: async () => [
        {
          productId: 'c67b917d-d8f8-4de6-9c47-fbaa82a705e5',
          imageKey: null,
          shortName: 'Cable',
          averagePrice: '3.50',
        },
      ],
    });

    expect(result).toEqual({
      sales: [
        {
          productId: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
          imageUrl:
            'https://media.example.test/products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c/image.webp',
          shortName: 'Cámara',
          averagePrice: 18.125,
        },
      ],
      purchases: [
        {
          productId: 'c67b917d-d8f8-4de6-9c47-fbaa82a705e5',
          imageUrl: null,
          shortName: 'Cable',
          averagePrice: 3.5,
        },
      ],
    });
  });
});
