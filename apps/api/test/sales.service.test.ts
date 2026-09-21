import { describe, expect, it } from 'vitest';

import { saleCreateSchema, saleUpdateSchema } from '@alitracker/shared';

import { createSale, updateSale } from '../src/modules/sales/sales.service.js';

const productId = '8d8c883c-7e36-4af0-a8b3-152b20c41f3c';
const saleId = 'cf946b24-2da9-4886-98ad-5a23a138bf74';

describe('sales service', () => {
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
          status: sale.status,
          date: new Date('2026-09-21T10:00:00.000Z'),
        };
      },
    });

    expect(receivedInput?.date).toBeUndefined();
    expect(result).toMatchObject({ totalSalePrice: 25.75, date: '2026-09-21T10:00:00.000Z' });
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
