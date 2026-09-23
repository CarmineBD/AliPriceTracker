import { describe, expect, it } from 'vitest';

import { getMetrics } from '../src/modules/metrics/metrics.service.js';

describe('metrics service', () => {
  it('calculates totals, profit, and ROI from the purchase investment', async () => {
    await expect(
      getMetrics({
        getTotals: async () => ({ totalPurchases: '120.10', totalSales: '180.25' }),
      }),
    ).resolves.toEqual({
      totalPurchases: 120.1,
      totalSales: 180.25,
      totalProfit: 60.15,
      roi: 50.08,
    });
  });

  it('does not calculate ROI when there is no purchase investment', async () => {
    await expect(
      getMetrics({
        getTotals: async () => ({ totalPurchases: '0', totalSales: '25.00' }),
      }),
    ).resolves.toEqual({
      totalPurchases: 0,
      totalSales: 25,
      totalProfit: 25,
      roi: null,
    });
  });
});
