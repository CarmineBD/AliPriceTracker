import { describe, expect, it } from 'vitest';

import { buildBestOfferHistoryChartData } from './product-best-offer-history.utils';

describe('buildBestOfferHistoryChartData', () => {
  it('keeps the publication URL attached to each historical point', () => {
    const data = buildBestOfferHistoryChartData({
      from: '2026-09-10T00:00:00.000Z',
      current: null,
      now: '2026-09-12T12:00:00.000Z',
      baseline: {
        id: '1f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
        isAvailable: true,
        publicationProductId: '2f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
        price: '210.00',
        currency: 'EUR',
        quantityAvailable: 12,
        publicationUrl: 'https://example.com/baseline',
        capturedAt: '2026-09-09T12:00:00.000Z',
      },
      history: [
        {
          id: '3f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
          isAvailable: true,
          publicationProductId: '4f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
          price: '199.99',
          currency: 'EUR',
          quantityAvailable: 30,
          publicationUrl: 'https://example.com/winner',
          capturedAt: '2026-09-12T12:00:00.000Z',
        },
      ],
    });

    expect(data).toEqual([
      expect.objectContaining({ publicationUrl: 'https://example.com/baseline' }),
      expect.objectContaining({ publicationUrl: 'https://example.com/winner' }),
    ]);
  });

  it('continues the current best offer to the present time', () => {
    const current = {
      id: '3f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
      isAvailable: true,
      publicationProductId: '4f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
      price: '199.99',
      currency: 'EUR',
      quantityAvailable: 30,
      publicationUrl: 'https://example.com/winner',
      capturedAt: '2026-09-12T12:00:00.000Z',
    };
    const data = buildBestOfferHistoryChartData({
      baseline: null,
      history: [],
      current,
      now: '2026-09-12T14:00:00.000Z',
    });

    expect(data).toHaveLength(2);
    expect(data[1]).toMatchObject({
      capturedAt: '2026-09-12T14:00:00.000Z',
      price: 199.99,
      quantityAvailable: 30,
      isProjectedToNow: true,
    });
  });
});
