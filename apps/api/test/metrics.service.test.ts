import { describe, expect, it } from 'vitest';

import { getMetrics, getProfitHistory } from '../src/modules/metrics/metrics.service.js';

const firstPurchaseDate = new Date('2026-01-01T00:00:00.000Z');
const secondPurchaseDate = new Date('2026-01-02T00:00:00.000Z');
const saleDate = new Date('2026-01-03T00:00:00.000Z');

function profitHistoryData() {
  return {
    totalPurchases: '420.00',
    totalSales: '700.00',
    totalShippingCosts: '20.00',
    purchaseMovements: [
      {
        purchaseId: 'purchase-before-range',
        productId: 'drone',
        totalFinalPrice: '100.00',
        date: new Date('2025-12-30T00:00:00.000Z'),
        componentProductId: null,
        componentQuantity: null,
        averageSellingPrice: '300.00',
      },
      {
        purchaseId: 'purchase-jan-1',
        productId: 'drone',
        totalFinalPrice: '200.00',
        date: new Date('2026-01-01T00:00:00.000Z'),
        componentProductId: null,
        componentQuantity: null,
        averageSellingPrice: '300.00',
      },
      {
        purchaseId: 'purchase-jan-3',
        productId: 'drone',
        totalFinalPrice: '120.00',
        date: new Date('2026-01-03T00:00:00.000Z'),
        componentProductId: null,
        componentQuantity: null,
        averageSellingPrice: '300.00',
      },
    ],
    saleMovements: [
      {
        saleId: 'sale-before-range',
        productId: 'drone',
        totalSalePrice: '200.00',
        shippingCost: '20.00',
        status: 'completed',
        date: new Date('2025-12-31T00:00:00.000Z'),
        componentProductId: null,
        componentQuantity: null,
      },
      {
        saleId: 'sale-jan-2',
        productId: 'drone',
        totalSalePrice: '300.00',
        shippingCost: '20.00',
        status: 'completed',
        date: new Date('2026-01-02T00:00:00.000Z'),
        componentProductId: null,
        componentQuantity: null,
      },
      {
        saleId: 'sale-jan-4',
        productId: 'drone',
        totalSalePrice: '200.00',
        shippingCost: '0.00',
        status: 'completed',
        date: new Date('2026-01-04T00:00:00.000Z'),
        componentProductId: null,
        componentQuantity: null,
      },
    ],
  };
}

describe('metrics service', () => {
  it('uses FIFO costs for realized profit and calculates the estimated stock sale value', async () => {
    await expect(
      getMetrics({
        getMetricsData: async () => ({
          totalPurchases: '320.00',
          totalSales: '250.00',
          totalShippingCosts: '15.00',
          purchaseMovements: [
            {
              purchaseId: 'purchase-1',
              productId: 'drone',
              totalFinalPrice: '150.00',
              date: firstPurchaseDate,
              componentProductId: null,
              componentQuantity: null,
              averageSellingPrice: '250.00',
            },
            {
              purchaseId: 'purchase-2',
              productId: 'drone',
              totalFinalPrice: '170.00',
              date: secondPurchaseDate,
              componentProductId: null,
              componentQuantity: null,
              averageSellingPrice: '250.00',
            },
          ],
          saleMovements: [
            {
              saleId: 'sale-1',
              productId: 'drone',
              totalSalePrice: '250.00',
              shippingCost: '15.00',
              status: 'completed',
              date: saleDate,
              componentProductId: null,
              componentQuantity: null,
            },
          ],
        }),
      }),
    ).resolves.toEqual({
      totalPurchases: 320,
      totalSales: 235,
      netCashFlow: -85,
      realizedProfit: 85,
      pendingSalesCount: 0,
      realizedRoi: 56.7,
      stockCostValue: 170,
      estimatedStockSaleValue: 250,
      potentialStockProfit: 80,
    });
  });

  it('allocates each combo purchase to its components before applying FIFO', async () => {
    await expect(
      getMetrics({
        getMetricsData: async () => ({
          totalPurchases: '380.00',
          totalSales: '250.00',
          totalShippingCosts: '20.00',
          purchaseMovements: [
            {
              purchaseId: 'combo-purchase',
              productId: 'combo',
              totalFinalPrice: '210.00',
              date: firstPurchaseDate,
              componentProductId: 'drone',
              componentQuantity: 1,
              averageSellingPrice: '250.00',
            },
            {
              purchaseId: 'combo-purchase',
              productId: 'combo',
              totalFinalPrice: '210.00',
              date: firstPurchaseDate,
              componentProductId: 'hub',
              componentQuantity: 1,
              averageSellingPrice: '100.00',
            },
            {
              purchaseId: 'drone-purchase',
              productId: 'drone',
              totalFinalPrice: '170.00',
              date: secondPurchaseDate,
              componentProductId: null,
              componentQuantity: null,
              averageSellingPrice: '250.00',
            },
          ],
          saleMovements: [
            {
              saleId: 'drone-sale',
              productId: 'drone',
              totalSalePrice: '250.00',
              shippingCost: '20.00',
              status: 'completed',
              date: saleDate,
              componentProductId: null,
              componentQuantity: null,
            },
          ],
        }),
      }),
    ).resolves.toEqual({
      totalPurchases: 380,
      totalSales: 230,
      netCashFlow: -150,
      realizedProfit: 80,
      pendingSalesCount: 0,
      realizedRoi: 53.3,
      stockCostValue: 230,
      estimatedStockSaleValue: 350,
      potentialStockProfit: 120,
    });
  });

  it('keeps cash flow based on every registered purchase and sale', async () => {
    await expect(
      getMetrics({
        getMetricsData: async () => ({
          totalPurchases: '120.10',
          totalSales: '180.25',
          totalShippingCosts: '2.00',
          purchaseMovements: [],
          saleMovements: [],
        }),
      }),
    ).resolves.toMatchObject({
      totalPurchases: 120.1,
      totalSales: 178.25,
      netCashFlow: 58.15,
      realizedProfit: 0,
      realizedRoi: null,
      stockCostValue: 0,
      estimatedStockSaleValue: 0,
      potentialStockProfit: 0,
    });
  });

  it('fills the current month by day and uses the FIFO cost assigned to each completed sale', async () => {
    const history = await getProfitHistory(
      'month',
      {},
      { getMetricsData: async () => profitHistoryData() },
      new Date('2026-01-31T12:00:00.000Z'),
    );

    expect(history.points).toHaveLength(31);
    expect(history.points[0]).toMatchObject({
      date: '2026-01-01T00:00:00.000Z',
      profit: 0,
      cumulativeProfit: 0,
      salesCount: 0,
    });
    expect(history.points.find((point) => point.date.startsWith('2026-01-02'))).toMatchObject({
      profit: 80,
      cumulativeProfit: 80,
      salesCount: 1,
      revenue: 280,
      cogs: 200,
    });
    expect(history.points.find((point) => point.date.startsWith('2026-01-03'))).toMatchObject({
      profit: 0,
      cumulativeProfit: 80,
      salesCount: 0,
      revenue: 0,
      cogs: 0,
    });
    expect(history.summary).toEqual({
      profit: 160,
      roi: 50,
      salesCount: 2,
      revenue: 480,
      cogs: 320,
      averageProfitPerSale: 80,
      averageProfitPerPeriodWithSales: 80,
    });
  });

  it('groups the last year by month', async () => {
    const history = await getProfitHistory(
      'year',
      {},
      { getMetricsData: async () => profitHistoryData() },
      new Date('2026-09-24T12:00:00.000Z'),
    );

    expect(history.points).toHaveLength(12);
    expect(history.points[0]).toMatchObject({
      date: '2025-10-01T00:00:00.000Z',
      profit: 0,
      cumulativeProfit: 0,
      salesCount: 0,
    });
    expect(history.points.find((point) => point.date.startsWith('2026-01'))).toMatchObject({
      date: '2026-01-01T00:00:00.000Z',
      profit: 160,
      cumulativeProfit: 240,
      salesCount: 2,
    });
    expect(history.points.at(-1)).toMatchObject({
      date: '2026-09-01T00:00:00.000Z',
      profit: 0,
      cumulativeProfit: 240,
      salesCount: 0,
    });
  });

  it('returns the complete selected month within the last year', async () => {
    const history = await getProfitHistory(
      'month',
      { month: '2025-12' },
      { getMetricsData: async () => profitHistoryData() },
      new Date('2026-01-31T12:00:00.000Z'),
    );

    expect(history.points).toHaveLength(31);
    expect(history.points[0]).toMatchObject({
      date: '2025-12-01T00:00:00.000Z',
      profit: 0,
      cumulativeProfit: 0,
      salesCount: 0,
    });
    expect(history.points.at(-1)).toMatchObject({
      date: '2025-12-31T00:00:00.000Z',
      profit: 80,
      cumulativeProfit: 80,
      salesCount: 1,
      revenue: 180,
      cogs: 100,
    });
  });
});
