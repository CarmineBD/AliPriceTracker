import { describe, expect, it } from 'vitest';

import { listStores } from '../src/modules/stores/stores.service';

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
});
