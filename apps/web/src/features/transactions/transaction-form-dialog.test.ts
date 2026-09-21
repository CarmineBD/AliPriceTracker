import type { ProductOffer } from '@alitracker/shared';
import { describe, expect, it } from 'vitest';

import { sortOffersByPrice } from './transaction-form-dialog';

function createOffer(id: string, price: string | null): ProductOffer {
  return {
    id,
    sellerName: null,
    sellerLocation: null,
    sellerReviewScore: null,
    sellerSalesCount: null,
    price,
    currency: price === null ? null : 'EUR',
    quantityAvailable: 1,
    maxPurchase: 1,
    url: `https://example.com/${id}`,
  };
}

describe('sortOffersByPrice', () => {
  it('orders priced offers from lowest to highest and leaves unknown prices last', () => {
    const offers = [
      createOffer('00000000-0000-4000-8000-000000000003', null),
      createOffer('00000000-0000-4000-8000-000000000002', '12.50'),
      createOffer('00000000-0000-4000-8000-000000000001', '4.99'),
    ];

    expect(sortOffersByPrice(offers).map((offer) => offer.price)).toEqual(['4.99', '12.50', null]);
    expect(offers.map((offer) => offer.price)).toEqual([null, '12.50', '4.99']);
  });
});
