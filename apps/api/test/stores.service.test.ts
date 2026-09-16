import { describe, expect, it } from 'vitest';

import { getStore, listStores } from '../src/modules/stores/stores.service';

describe('listStores', () => {
  it('returns store fields and the aggregated publication count in JSON-safe values', async () => {
    const stores = await listStores({
      findAll: async () => [
        {
          id: '9f98dbb8-99f6-4058-96f0-9577322cffdb',
          aliexpressStoreId: 1105347613n,
          name: 'Tienda Marco Europa',
          location: 'España',
          reviewScore: '4.9',
          sales180d: '4.000+',
          publicationsCount: 3,
        },
      ],
    });

    expect(stores).toEqual([
      {
        id: '9f98dbb8-99f6-4058-96f0-9577322cffdb',
        aliexpressStoreId: '1105347613',
        name: 'Tienda Marco Europa',
        location: 'España',
        reviewScore: 4.9,
        sales180d: '4.000+',
        publicationsCount: 3,
      },
    ]);
  });

  it('groups a store publication and its associated products', async () => {
    const store = await getStore('9f98dbb8-99f6-4058-96f0-9577322cffdb', {
      findByIdWithPublications: async () => ({
        store: {
          id: '9f98dbb8-99f6-4058-96f0-9577322cffdb',
          aliexpressStoreId: 1105347613n,
          name: 'Tienda Marco Europa',
          location: 'EspaÃ±a',
          reviewScore: '4.9',
          sales180d: '4.000+',
          createdAt: new Date('2026-09-16T10:00:00.000Z'),
          updatedAt: new Date('2026-09-16T10:00:00.000Z'),
        },
        publicationRows: [
          {
            publicationId: '9ceaa3f1-6d2c-4405-8414-323045d94219',
            publicationAliexpressProductId: 1005012470064491n,
            publicationName: 'DJI Lito X1',
            publicationUrl: 'https://www.aliexpress.com/item/1005012470064491.html',
            publicationSalesCount: '97',
            publicationReviewScore: '4.6',
            publicationReviewCount: 10,
            publicationProductId: '2f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
            productId: '9f7d2e8f-1781-411a-b74a-7923d9a83ea1',
            productName: 'DJI Lito X1',
            productShortName: 'Lito X1',
            aliexpressSkuId: '12000058446755029',
            price: '591.70',
            currency: 'EUR',
            quantityAvailable: 17,
            maxPurchase: 1,
          },
        ],
      }),
    });

    expect(store).toEqual({
      id: '9f98dbb8-99f6-4058-96f0-9577322cffdb',
      aliexpressStoreId: '1105347613',
      name: 'Tienda Marco Europa',
      location: 'EspaÃ±a',
      reviewScore: 4.9,
      sales180d: '4.000+',
      publicationsCount: 1,
      publications: [
        {
          id: '9ceaa3f1-6d2c-4405-8414-323045d94219',
          aliexpressProductId: '1005012470064491',
          name: 'DJI Lito X1',
          url: 'https://www.aliexpress.com/item/1005012470064491.html',
          salesCount: '97',
          reviewScore: 4.6,
          reviewCount: 10,
          products: [
            {
              id: '2f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
              productId: '9f7d2e8f-1781-411a-b74a-7923d9a83ea1',
              productName: 'DJI Lito X1',
              productShortName: 'Lito X1',
              aliexpressSkuId: '12000058446755029',
              price: '591.70',
              currency: 'EUR',
              quantityAvailable: 17,
              maxPurchase: 1,
            },
          ],
        },
      ],
    });
  });
});
