import { describe, expect, it } from 'vitest';

import { saleCreateSchema, saleUpdateSchema } from '@alitracker/shared';

import { createSale, listSales, updateSale } from '../src/modules/sales/sales.service.js';

const productId = '8d8c883c-7e36-4af0-a8b3-152b20c41f3c';
const saleId = 'cf946b24-2da9-4886-98ad-5a23a138bf74';

describe('sales service', () => {
  it('includes each sale profit using its FIFO cost and shipping cost', async () => {
    await expect(
      listSales(
        { page: 1, pageSize: 20 },
        {
          findPage: async () => ({
            items: [
              {
                id: saleId,
                productId,
                imageKey: null,
                shortName: 'Teclado',
                totalSalePrice: '50.00',
                shippingCost: '5.00',
                status: 'completed',
                date: new Date('2026-09-21T10:00:00.000Z'),
              },
            ],
            total: 1,
          }),
        },
        {
          getMovementData: async () => ({
            purchaseMovements: [
              {
                purchaseId: 'purchase-1',
                productId: 'combo-1',
                purchaseProductShortName: 'Pack teclado y ratón',
                totalFinalPrice: '30.00',
                date: new Date('2026-09-20T10:00:00.000Z'),
                componentProductId: productId,
                componentProductShortName: 'Teclado',
                componentQuantity: 1,
                averageSellingPrice: '50.00',
              },
            ],
            saleMovements: [
              {
                saleId,
                productId,
                totalSalePrice: '50.00',
                shippingCost: '5.00',
                status: 'completed',
                date: new Date('2026-09-21T10:00:00.000Z'),
                componentProductId: null,
                componentQuantity: null,
              },
            ],
          }),
        },
      ),
    ).resolves.toMatchObject({
      sales: [
        {
          id: saleId,
          profit: 15,
          profitBreakdown: {
            revenue: 50,
            shippingCost: 5,
            netRevenue: 45,
            cost: 30,
            allocations: [
              {
                source: 'combo',
                purchaseName: 'Pack teclado y ratón',
                componentName: 'Teclado',
                purchasePrice: 30,
                quantity: 1,
                cost: 30,
              },
            ],
          },
        },
      ],
    });
  });

  it('creates a sale with its date omitted for the database default', async () => {
    const input = saleCreateSchema.parse({
      productId,
      totalSalePrice: 25.75,
      status: 'to_be_sent',
    });
    let receivedInput: typeof input | undefined;

    const result = await createSale(input, {
      findProduct: async () => ({ id: productId }),
      create: async (sale) => {
        receivedInput = sale;
        return {
          id: saleId,
          productId: sale.productId,
          totalSalePrice: '25.75',
          shippingCost: sale.shippingCost.toFixed(2),
          status: sale.status,
          date: new Date('2026-09-21T10:00:00.000Z'),
        };
      },
    });

    expect(receivedInput?.date).toBeUndefined();
    expect(result).toMatchObject({
      totalSalePrice: 25.75,
      shippingCost: 0,
      date: '2026-09-21T10:00:00.000Z',
    });
  });

  it('returns not found before updating a missing sale', async () => {
    const input = saleUpdateSchema.parse({ status: 'sent' });

    await expect(
      updateSale(saleId, input, {
        findById: async () => undefined,
        findProduct: async () => ({ id: productId }),
        update: async () => {
          throw new Error('should not update');
        },
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
