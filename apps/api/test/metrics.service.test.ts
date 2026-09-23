import { describe, expect, it } from 'vitest';

import { getMetrics } from '../src/modules/metrics/metrics.service.js';

const firstPurchaseDate = new Date('2026-01-01T00:00:00.000Z');
const secondPurchaseDate = new Date('2026-01-02T00:00:00.000Z');
const saleDate = new Date('2026-01-03T00:00:00.000Z');

describe('metrics service', () => {
  it('uses FIFO costs for realized profit, stock value, and potential stock profit', async () => {
    await expect(
      getMetrics({
        getMetricsData: async () => ({
          totalPurchases: '320.00',
          totalSales: '250.00',
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
              date: saleDate,
              componentProductId: null,
              componentQuantity: null,
            },
          ],
        }),
      }),
    ).resolves.toEqual({
      totalPurchases: 320,
      totalSales: 250,
      netCashFlow: -70,
      realizedProfit: 100,
      stockValue: 170,
      potentialStockProfit: 80,
    });
  });

  it('allocates each combo purchase to its components before applying FIFO', async () => {
    await expect(
      getMetrics({
        getMetricsData: async () => ({
          totalPurchases: '380.00',
          totalSales: '250.00',
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
              date: saleDate,
              componentProductId: null,
              componentQuantity: null,
            },
          ],
        }),
      }),
    ).resolves.toEqual({
      totalPurchases: 380,
      totalSales: 250,
      netCashFlow: -130,
      realizedProfit: 100,
      stockValue: 230,
      potentialStockProfit: 120,
    });
  });

  it('keeps cash flow based on every registered purchase and sale', async () => {
    await expect(
      getMetrics({
        getMetricsData: async () => ({
          totalPurchases: '120.10',
          totalSales: '180.25',
          purchaseMovements: [],
          saleMovements: [],
        }),
      }),
    ).resolves.toMatchObject({
      totalPurchases: 120.1,
      totalSales: 180.25,
      netCashFlow: 60.15,
      realizedProfit: 0,
      stockValue: 0,
      potentialStockProfit: 0,
    });
  });
});
