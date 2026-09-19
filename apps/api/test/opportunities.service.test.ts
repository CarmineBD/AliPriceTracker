import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { opportunitiesListQuerySchema, type Coupon } from '@alitracker/shared';

import { app } from '../src/app';
import type {
  CurrentProductOffer,
  ProductComboComponent,
} from '../src/modules/opportunities/opportunities.repository';
import {
  calculateProfit,
  calculateRoi,
  findBestApplicableCoupon,
  findNextCoupon,
  listOpportunities,
  resolveEstimatedSellingPrice,
} from '../src/modules/opportunities/opportunities.service';

const productId = '00000000-0000-4000-8000-000000000001';
const componentId = '00000000-0000-4000-8000-000000000002';

const coupons: Coupon[] = [
  {
    id: '00000000-0000-4000-8000-000000000011',
    minPurchase: 59,
    discountAmount: 5,
    category: 'event',
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    minPurchase: 89,
    discountAmount: 8,
    category: 'event',
  },
  {
    id: '00000000-0000-4000-8000-000000000013',
    minPurchase: 129,
    discountAmount: 15,
    category: 'event',
  },
  {
    id: '00000000-0000-4000-8000-000000000014',
    minPurchase: 169,
    discountAmount: 25,
    category: 'event',
  },
];

const offer = (overrides: Partial<CurrentProductOffer> = {}): CurrentProductOffer => ({
  productId,
  name: 'DJI Neo 2 Fly More Combo',
  shortName: 'DJI Neo 2',
  iconUrl: null,
  imageKey: null,
  averageSellingPrice: '355.00',
  price: '289.00',
  currency: 'EUR',
  quantityAvailable: 5,
  publicationUrl: 'https://example.com/offer',
  isAvailable: true,
  capturedAt: new Date('2026-09-17T12:00:00.000Z'),
  ...overrides,
});

function componentsByProductId(components: ProductComboComponent[]) {
  return new Map([[productId, components]]);
}

describe('opportunity coupons', () => {
  it('selects no coupon when none reaches the minimum and finds the nearest next coupon', () => {
    expect(findBestApplicableCoupon(30, coupons)).toBeNull();
    expect(findNextCoupon(30, coupons)).toEqual(coupons[0]);
  });

  it('selects the sole applicable coupon', () => {
    expect(findBestApplicableCoupon(60, coupons)).toEqual(coupons[0]);
  });

  it('selects the applicable coupon with the greatest discount', () => {
    expect(findBestApplicableCoupon(150, coupons)).toEqual(coupons[2]);
  });

  it('returns null when every coupon threshold has already been reached', () => {
    expect(findNextCoupon(200, coupons)).toBeNull();
  });
});

describe('resolveEstimatedSellingPrice', () => {
  it('uses the product price for a normal product and returns null when it is unavailable', () => {
    expect(resolveEstimatedSellingPrice(offer(), new Map())).toBe(355);
    expect(
      resolveEstimatedSellingPrice(offer({ averageSellingPrice: null }), new Map()),
    ).toBeNull();
  });

  it('uses every priced combo component, including quantities greater than one', () => {
    expect(
      resolveEstimatedSellingPrice(
        offer({ averageSellingPrice: '999.00' }),
        componentsByProductId([
          { productId, containsProductId: componentId, quantity: 2, averageSellingPrice: '180.00' },
          {
            productId,
            containsProductId: '00000000-0000-4000-8000-000000000003',
            quantity: 3,
            averageSellingPrice: '95.00',
          },
        ]),
      ),
    ).toBe(645);
  });

  it('falls back to the combo price when one component is unpriced', () => {
    expect(
      resolveEstimatedSellingPrice(
        offer({ averageSellingPrice: '280.00' }),
        componentsByProductId([
          { productId, containsProductId: componentId, quantity: 1, averageSellingPrice: '180.00' },
          {
            productId,
            containsProductId: '00000000-0000-4000-8000-000000000003',
            quantity: 1,
            averageSellingPrice: null,
          },
        ]),
      ),
    ).toBe(280);
  });

  it('cannot price an incomplete combo when the parent has no fallback price', () => {
    expect(
      resolveEstimatedSellingPrice(
        offer({ averageSellingPrice: null }),
        componentsByProductId([
          { productId, containsProductId: componentId, quantity: 1, averageSellingPrice: null },
        ]),
      ),
    ).toBeNull();
  });
});

describe('opportunity calculations', () => {
  it('calculates gross profit and rounds ROI to two decimals', () => {
    const profit = calculateProfit(355, 259);
    expect(profit).toBe(96);
    expect(calculateRoi(profit, 259)).toBe(37.07);
  });

  it('does not calculate ROI for zero or negative effective purchase prices', () => {
    expect(calculateRoi(100, 0)).toBeNull();
    expect(calculateRoi(100, -1)).toBeNull();
  });
});

describe('listOpportunities', () => {
  it('does not apply coupons when there is no active event', async () => {
    const result = await listOpportunities(
      { sort: 'roi-desc', page: 1, pageSize: 20 },
      new Date(),
      {
        opportunities: {
          findProductsWithCurrentOffers: async () => [offer()],
          findComboComponents: async () => [],
        },
        events: { findActiveWithCoupons: async () => [], findCouponOptions: async () => [] },
      },
    );

    expect(result.opportunities).toEqual([
      expect.objectContaining({
        coupon: null,
        nextCoupon: null,
        amountToNextCoupon: null,
        effectivePurchasePrice: 289,
        shortName: 'DJI Neo 2',
      }),
    ]);
  });

  it('handles an active event without coupons and excludes unavailable or unpriceable products', async () => {
    const result = await listOpportunities(
      { sort: 'roi-desc', page: 1, pageSize: 20 },
      new Date(),
      {
        opportunities: {
          findProductsWithCurrentOffers: async () => [
            offer({ isAvailable: false }),
            offer({ productId: componentId, averageSellingPrice: null }),
            offer(),
          ],
          findComboComponents: async () => [],
        },
        events: {
          findActiveWithCoupons: async () => [
            {
              id: '00000000-0000-4000-8000-000000000021',
              name: 'Event without coupons',
              startsAt: new Date('2026-09-17T00:00:00.000Z'),
              endsAt: new Date('2026-09-18T00:00:00.000Z'),
              coupons: [],
            },
          ],
          findCouponOptions: async () => [],
        },
      },
    );

    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0]).toMatchObject({ productId, coupon: null, nextCoupon: null });
  });

  it('excludes zero and negative profit opportunities before pagination', async () => {
    const result = await listOpportunities(
      { sort: 'roi-desc', page: 1, pageSize: 20 },
      new Date(),
      {
        opportunities: {
          findProductsWithCurrentOffers: async () => [
            offer({
              productId: '00000000-0000-4000-8000-000000000041',
              name: 'Sin beneficio',
              averageSellingPrice: '100.00',
              price: '100.00',
            }),
            offer({
              productId: '00000000-0000-4000-8000-000000000042',
              name: 'Con pérdidas',
              averageSellingPrice: '99.00',
              price: '100.00',
            }),
            offer({
              productId: '00000000-0000-4000-8000-000000000043',
              name: 'Rentable',
              averageSellingPrice: '101.00',
              price: '100.00',
            }),
          ],
          findComboComponents: async () => [],
        },
        events: { findActiveWithCoupons: async () => [], findCouponOptions: async () => [] },
      },
    );

    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0]).toMatchObject({ name: 'Rentable', estimatedProfit: 1 });
    expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
  });

  it('applies the best coupon and reports the next threshold for one unit', async () => {
    const result = await listOpportunities(
      { sort: 'roi-desc', page: 1, pageSize: 20 },
      new Date(),
      {
        opportunities: {
          findProductsWithCurrentOffers: async () => [offer({ price: '150.00' })],
          findComboComponents: async () => [],
        },
        events: {
          findActiveWithCoupons: async () => [
            {
              id: '00000000-0000-4000-8000-000000000021',
              name: 'Sale',
              startsAt: new Date('2026-09-17T00:00:00.000Z'),
              endsAt: new Date('2026-09-18T00:00:00.000Z'),
              coupons: coupons.map((coupon) => ({
                ...coupon,
                minPurchase: coupon.minPurchase.toFixed(2),
                discountAmount: coupon.discountAmount.toFixed(2),
              })),
            },
          ],
          findCouponOptions: async () =>
            coupons.map((coupon) => ({
              ...coupon,
              minPurchase: coupon.minPurchase.toFixed(2),
              discountAmount: coupon.discountAmount.toFixed(2),
            })),
        },
      },
    );

    expect(result.opportunities[0]).toMatchObject({
      coupon: coupons[2],
      effectivePurchasePrice: 135,
      nextCoupon: coupons[3],
      amountToNextCoupon: 19,
    });
  });

  it('uses selected coupons from the application, including those outside the active event', async () => {
    const inactiveCoupon: Coupon = {
      id: '00000000-0000-4000-8000-000000000015',
      minPurchase: 129,
      discountAmount: 20,
      category: 'special',
    };
    const result = await listOpportunities(
      {
        sort: 'roi-desc',
        page: 1,
        pageSize: 20,
        couponIds: [coupons[1]!.id, inactiveCoupon.id],
      },
      new Date(),
      {
        opportunities: {
          findProductsWithCurrentOffers: async () => [offer({ price: '150.00' })],
          findComboComponents: async () => [],
        },
        events: {
          findActiveWithCoupons: async () => [
            {
              id: '00000000-0000-4000-8000-000000000021',
              name: 'Sale',
              startsAt: new Date('2026-09-17T00:00:00.000Z'),
              endsAt: new Date('2026-09-18T00:00:00.000Z'),
              coupons: coupons.map((coupon) => ({
                ...coupon,
                minPurchase: coupon.minPurchase.toFixed(2),
                discountAmount: coupon.discountAmount.toFixed(2),
              })),
            },
          ],
          findCouponOptions: async () =>
            [...coupons, inactiveCoupon].map((coupon) => ({
              ...coupon,
              minPurchase: coupon.minPurchase.toFixed(2),
              discountAmount: coupon.discountAmount.toFixed(2),
            })),
        },
      },
    );

    expect(result.opportunities[0]).toMatchObject({
      coupon: inactiveCoupon,
      effectivePurchasePrice: 130,
      nextCoupon: null,
      amountToNextCoupon: null,
    });
  });

  it('sorts by ROI before paginating and leaves the pagination metadata consistent', async () => {
    const result = await listOpportunities({ sort: 'roi-desc', page: 1, pageSize: 1 }, new Date(), {
      opportunities: {
        findProductsWithCurrentOffers: async () => [
          offer({
            productId: '00000000-0000-4000-8000-000000000031',
            name: 'ROI bajo',
            averageSellingPrice: '120.00',
            price: '100.00',
          }),
          offer({
            productId: '00000000-0000-4000-8000-000000000032',
            name: 'ROI alto',
            averageSellingPrice: '300.00',
            price: '100.00',
          }),
        ],
        findComboComponents: async () => [],
      },
      events: { findActiveWithCoupons: async () => [], findCouponOptions: async () => [] },
    });

    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0]).toMatchObject({ name: 'ROI alto', roi: 200 });
    expect(result.pagination).toEqual({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
  });
});

describe('opportunities request validation', () => {
  it('accepts one or more repeated coupon IDs and leaves the filter undefined when omitted', () => {
    expect(
      opportunitiesListQuerySchema.parse({
        sort: 'roi-desc',
        couponIds: coupons[0]!.id,
      }).couponIds,
    ).toEqual([coupons[0]!.id]);
    expect(
      opportunitiesListQuerySchema.parse({
        sort: 'roi-desc',
        couponIds: [coupons[0]!.id, coupons[1]!.id],
      }).couponIds,
    ).toEqual([coupons[0]!.id, coupons[1]!.id]);
    expect(opportunitiesListQuerySchema.parse({ sort: 'roi-desc' }).couponIds).toBeUndefined();
  });

  it('requires the ROI descending sort and validates pagination before accessing the database', async () => {
    expect((await request(app).get('/api/opportunities')).status).toBe(400);
    expect((await request(app).get('/api/opportunities?sort=profit-desc')).status).toBe(400);
    expect((await request(app).get('/api/opportunities?sort=roi-desc&page=0')).status).toBe(400);
    expect(
      (await request(app).get('/api/opportunities?sort=roi-desc&couponIds=invalid')).status,
    ).toBe(400);
  });
});
