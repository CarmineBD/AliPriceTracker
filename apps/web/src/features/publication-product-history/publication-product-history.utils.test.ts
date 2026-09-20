import { describe, expect, it } from 'vitest';

import { buildHistoryChartData } from './publication-product-history.utils';

const baseline = {
  id: 'd2e8d182-8b6f-4560-9f89-80176020d418',
  price: '415.31',
  currency: 'EUR',
  quantityAvailable: 41,
  capturedAt: '2026-09-15T10:00:00.000Z',
};

const historyEntry = {
  id: 'adc81f82-d95e-477e-ba05-31c13b46baf5',
  price: '415.30',
  currency: 'EUR',
  quantityAvailable: 40,
  capturedAt: '2026-09-25T10:00:00.000Z',
};

describe('buildHistoryChartData', () => {
  it('uses the baseline state at the beginning of a filtered range', () => {
    const data = buildHistoryChartData({
      baseline,
      history: [historyEntry],
      current: { price: '415.30', currency: 'EUR', quantityAvailable: 40 },
      from: '2026-09-20T00:00:00.000Z',
      lastCheckedAt: '2026-09-25T10:00:00.000Z',
    });

    expect(data[0]).toMatchObject({
      capturedAt: '2026-09-20T00:00:00.000Z',
      price: 415.31,
      quantityAvailable: 41,
    });
    expect(data[1]).toMatchObject({
      capturedAt: historyEntry.capturedAt,
      price: 415.3,
      quantityAvailable: 40,
    });
  });

  it('extends the latest observed state to lastCheckedAt using current values', () => {
    const data = buildHistoryChartData({
      baseline: null,
      history: [historyEntry],
      current: { price: '414.00', currency: 'EUR', quantityAvailable: 38 },
      lastCheckedAt: '2026-09-28T10:00:00.000Z',
    });

    expect(data).toHaveLength(2);
    expect(data[1]).toMatchObject({
      capturedAt: '2026-09-28T10:00:00.000Z',
      price: 414,
      quantityAvailable: 38,
    });
  });

  it('continues the latest state to the present without treating it as an observation', () => {
    const data = buildHistoryChartData({
      baseline: null,
      history: [historyEntry],
      current: { price: '415.30', currency: 'EUR', quantityAvailable: 40 },
      lastCheckedAt: historyEntry.capturedAt,
      now: '2026-09-25T12:00:00.000Z',
    });

    expect(data).toHaveLength(2);
    expect(data[1]).toMatchObject({
      capturedAt: '2026-09-25T12:00:00.000Z',
      price: 415.3,
      quantityAvailable: 40,
      isProjectedToNow: true,
    });
  });

  it('does not duplicate the final point when it was captured at lastCheckedAt', () => {
    const data = buildHistoryChartData({
      baseline: null,
      history: [historyEntry],
      current: { price: '415.30', currency: 'EUR', quantityAvailable: 40 },
      lastCheckedAt: historyEntry.capturedAt,
    });

    expect(data).toHaveLength(1);
  });

  it('keeps price and stock together and preserves an unknown stock as null', () => {
    const data = buildHistoryChartData({
      baseline: null,
      history: [{ ...historyEntry, price: '400.10', quantityAvailable: null }],
      current: { price: '400.10', currency: 'EUR', quantityAvailable: null },
      lastCheckedAt: historyEntry.capturedAt,
    });

    expect(data[0]).toMatchObject({
      capturedAt: historyEntry.capturedAt,
      price: 400.1,
      quantityAvailable: null,
    });
  });
});
