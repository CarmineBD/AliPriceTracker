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
            variantName: 'DJI Neo2 Combo-Only Drone',
            price: '205,96€',
            stock: 222,
            image: 'https://example.test/drone.jpg',
            salable: true,
          },
        ],
        store: {
          aliexpressStoreId: '1104930936',
          name: 'Euro Frame Store',
          location: 'France',
          reviewScore: 4.9,
          sales180d: '20,000+',
        },
        publication: {
          aliexpressProductId: '1005010519851506',
          name: 'Dron de prueba',
          url: 'https://www.aliexpress.com/item/1005010519851506.html',
          salesCount: '4.000+',
          reviewScore: 4.7,
          reviewCount: 777,
        },
        products: [
          {
            aliexpressSkuId: 'sku-1',
            variantName: 'DJI Neo2 Combo-Only Drone',
            price: '205,96\u20ac',
            priceAmount: 205.96,
            currency: 'EUR',
            quantityAvailable: 222,
            maxPurchase: 1,
            imageUrl: 'https://example.test/drone.jpg',
            salable: true,
          },
        ],
      },
    });

    await expect(lookupAliExpressProduct('1005010519851506', requestProduct)).resolves.toEqual({
      status: 200,
      body: {
        store: {
          aliexpressStoreId: '1104930936',
          name: 'Euro Frame Store',
          location: 'France',
          reviewScore: 4.9,
          sales180d: '20,000+',
        },
        publication: {
          aliexpressProductId: '1005010519851506',
          name: 'Dron de prueba',
          url: 'https://www.aliexpress.com/item/1005010519851506.html',
          salesCount: '4.000+',
          reviewScore: 4.7,
          reviewCount: 777,
        },
        productId: '1005010519851506',
        productName: 'Dron de prueba',
        products: [
          {
            aliexpressSkuId: 'sku-1',
            id: 'sku-1',
            variantName: 'DJI Neo2 Combo-Only Drone',
            price: '205,96€',
            priceAmount: 205.96,
            currency: 'EUR',
            quantityAvailable: 222,
            maxPurchase: 1,
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
