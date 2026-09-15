import { describe, expect, it, vi } from 'vitest';

import { lookupAliExpressProduct } from '../src/modules/aliexpress-product-lookup/aliexpress-product-lookup.service';

describe('lookupAliExpressProduct', () => {
  it('adapts the existing AliExpress lookup result for the frontend', async () => {
    const requestProduct = vi.fn().mockResolvedValue({
      status: 200,
      body: {
        success: true,
        productId: '1005010519851506',
        productName: 'Dron de prueba',
        skuPrices: [
          {
            skuId: 'sku-1',
            name: 'Negro',
            price: '205,96€',
            stock: 222,
            image: 'https://example.test/drone.jpg',
            salable: true,
          },
        ],
      },
    });

    await expect(lookupAliExpressProduct('1005010519851506', requestProduct)).resolves.toEqual({
      status: 200,
      body: {
        productId: '1005010519851506',
        productName: 'Dron de prueba',
        products: [
          {
            id: 'sku-1',
            name: 'Negro',
            price: '205,96€',
            quantityAvailable: 222,
            imageUrl: 'https://example.test/drone.jpg',
            salable: true,
          },
        ],
      },
    });
  });

  it('does not expose diagnostics from a failed upstream request', async () => {
    const requestProduct = vi.fn().mockResolvedValue({
      status: 502,
      body: { success: false },
    });

    await expect(lookupAliExpressProduct('1005010519851506', requestProduct)).resolves.toEqual({
      status: 502,
      body: { error: 'No se pudo consultar la publicación de AliExpress.' },
    });
  });
});
