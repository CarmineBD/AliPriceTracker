import { describe, expect, it } from 'vitest';

import { getMetrics } from '../src/modules/metrics/metrics.service.js';

const firstPurchaseDate = new Date('2026-01-01T00:00:00.000Z');
const secondPurchaseDate = new Date('2026-01-02T00:00:00.000Z');
const saleDate = new Date('2026-01-03T00:00:00.000Z');

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
});
