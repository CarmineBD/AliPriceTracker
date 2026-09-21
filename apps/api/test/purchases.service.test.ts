import { describe, expect, it } from 'vitest';

import { purchaseCreateSchema, purchaseUpdateSchema } from '@alitracker/shared';

import { createPurchase, updatePurchase } from '../src/modules/purchases/purchases.service.js';

const productId = '8d8c883c-7e36-4af0-a8b3-152b20c41f3c';
const anotherProductId = 'c67b917d-d8f8-4de6-9c47-fbaa82a705e5';
const offerId = '60ff824e-a554-4a34-93ee-ffbbd8d994f0';
const purchaseId = 'cf946b24-2da9-4886-98ad-5a23a138bf74';

describe('purchases service', () => {
  it('creates a purchase without a date so the database applies today as its default', async () => {
    const input = purchaseCreateSchema.parse({
      productId,
      offerId,
      totalFinalPrice: 12.5,
      status: 'ordered',
    });
    let receivedInput: typeof input | undefined;

    const result = await createPurchase(input, {
      findProduct: async () => ({ id: productId }),
      findOffer: async () => ({ id: offerId, productId }),
      create: async (purchase) => {
        receivedInput = purchase;
        return {
          id: purchaseId,
          productId: purchase.productId,
          offerId: purchase.offerId ?? null,
          totalFinalPrice: '12.50',
          status: purchase.status,
          date: new Date('2026-09-21T10:00:00.000Z'),
        };
      },
    });

    expect(receivedInput?.date).toBeUndefined();
    expect(result).toMatchObject({ totalFinalPrice: 12.5, date: '2026-09-21T10:00:00.000Z' });
  });

  it('creates a historical purchase without an offer', async () => {
    const input = purchaseCreateSchema.parse({
      productId,
      totalFinalPrice: 12.5,
      status: 'received',
    });

    const result = await createPurchase(input, {
      findProduct: async () => ({ id: productId }),
      findOffer: async () => {
        throw new Error('An offer must not be queried when none was supplied.');
      },
      create: async () => ({
        id: purchaseId,
        productId,
        offerId: null,
        totalFinalPrice: '12.50',
        status: 'received',
        date: new Date('2026-09-21T10:00:00.000Z'),
      }),
    });

    expect(result.offerId).toBeNull();
  });

  it('rejects an offer that belongs to a different product', async () => {
    const input = purchaseCreateSchema.parse({
      productId,
      offerId,
      totalFinalPrice: 12.5,
      status: 'ordered',
    });

    await expect(
      createPurchase(input, {
        findProduct: async () => ({ id: productId }),
        findOffer: async () => ({ id: offerId, productId: anotherProductId }),
        create: async () => {
          throw new Error('should not create');
        },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('checks the final product and offer relationship when updating a purchase', async () => {
    const input = purchaseUpdateSchema.parse({ productId: anotherProductId });

    await expect(
      updatePurchase(purchaseId, input, {
        findById: async () => ({
          id: purchaseId,
          productId,
          offerId,
          totalFinalPrice: '12.50',
          status: 'ordered',
          date: new Date(),
        }),
        findProduct: async () => ({ id: anotherProductId }),
        findOffer: async () => ({ id: offerId, productId }),
        update: async () => {
          throw new Error('should not update');
        },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
