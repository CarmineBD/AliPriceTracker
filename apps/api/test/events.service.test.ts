import { describe, expect, it } from 'vitest';

import type { Coupon } from '@alitracker/shared';

import {
  createEvent,
  getActiveEvents,
  listCoupons,
  selectBestCoupon,
} from '../src/modules/events/events.service';

const coupons: Coupon[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    minPurchase: 39,
    discountAmount: 5,
    category: 'event',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    minPurchase: 79,
    discountAmount: 10,
    category: 'event',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    minPurchase: 159,
    discountAmount: 20,
    category: 'event',
  },
];

describe('selectBestCoupon', () => {
  it('chooses the best applicable coupon', () => {
    expect(selectBestCoupon(145, coupons)).toMatchObject({
      originalPrice: 145,
      discountAmount: 10,
      finalPrice: 135,
      coupon: coupons[1],
    });
  });

  it('returns the original price when no coupon applies', () => {
    expect(selectBestCoupon(30, coupons)).toMatchObject({
      originalPrice: 30,
      discountAmount: 0,
      finalPrice: 30,
      coupon: null,
    });
  });

  it('chooses the coupon that leaves the lowest final price when all apply', () => {
    expect(selectBestCoupon(200, coupons)).toMatchObject({
      discountAmount: 20,
      finalPrice: 180,
      coupon: coupons[2],
    });
  });

  it('breaks equal final prices using the lexicographically smaller coupon id', () => {
    const laterId: Coupon = {
      id: '00000000-0000-4000-8000-000000000020',
      minPurchase: 39,
      discountAmount: 10,
      category: 'event',
    };
    const earlierId: Coupon = {
      id: '00000000-0000-4000-8000-000000000010',
      minPurchase: 79,
      discountAmount: 10,
      category: 'event',
    };

    expect(selectBestCoupon(100, [laterId, earlierId]).coupon).toEqual(earlierId);
  });
});

describe('getActiveEvents', () => {
  it('maps database numeric values to the API contract', async () => {
    const currentTime = new Date('2026-11-11T12:00:00.000Z');
    const result = await getActiveEvents(currentTime, {
      findActiveWithCoupons: async () => [
        {
          id: '00000000-0000-4000-8000-000000000001',
          name: '11.11 2026',
          startsAt: new Date('2026-11-11T00:00:00.000Z'),
          endsAt: new Date('2026-11-12T00:00:00.000Z'),
          coupons: [
            {
              id: '00000000-0000-4000-8000-000000000002',
              minPurchase: '79.00',
              discountAmount: '10.00',
              category: 'event',
            },
          ],
        },
      ],
    });

    expect(result).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000001',
        name: '11.11 2026',
        startsAt: '2026-11-11T00:00:00.000Z',
        endsAt: '2026-11-12T00:00:00.000Z',
        coupons: [
          {
            id: '00000000-0000-4000-8000-000000000002',
            minPurchase: 79,
            discountAmount: 10,
            category: 'event',
          },
        ],
      },
    ]);
  });
});

describe('events management', () => {
  it('maps coupon numeric database values in a paginated result', async () => {
    const result = await listCoupons(
      { page: 2, pageSize: 20 },
      {
        findCouponPage: async () => ({
          items: [
            {
              id: coupons[0]!.id,
              minPurchase: '39.00',
              discountAmount: '5.00',
              category: 'event',
              createdAt: new Date('2026-11-01T00:00:00.000Z'),
              updatedAt: new Date('2026-11-02T00:00:00.000Z'),
            },
          ],
          total: 21,
        }),
      },
    );

    expect(result).toMatchObject({
      coupons: [{ minPurchase: 39, discountAmount: 5, category: 'event' }],
      pagination: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
    });
  });

  it('refuses to create an event when a selected coupon does not exist', async () => {
    await expect(
      createEvent(
        {
          name: '11.11 2026',
          startsAt: '2026-11-11T00:00:00.000Z',
          endsAt: '2026-11-12T00:00:00.000Z',
          couponIds: [coupons[0]!.id],
        },
        {
          findCouponCount: async () => 0,
          createEvent: async () => {
            throw new Error('This repository method should not be called.');
          },
        },
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
