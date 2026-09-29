import { describe, expect, it, vi } from 'vitest';

import type { AliExpressProductResult } from '../src/modules/aliexpress-client/aliexpress-client';
import { lookupAliExpressProduct } from '../src/modules/aliexpress-product-lookup/aliexpress-product-lookup.service';

describe('lookupAliExpressProduct', () => {
  const repository = {
    findImportedSkuIds: vi
      .fn()
      .mockResolvedValue(new Map<string, string>([['sku-1', '9f98dbb8-99f6-4058-96f0-9577322cffdb']])),
  };

  function failedProductRequest(
    overrides: Pick<AliExpressProductResult, 'status'> & {
      errorCode?: AliExpressProductResult['body']['errorCode'];
      upstreamStatus?: AliExpressProductResult['body']['upstreamStatus'];
    },
  ): AliExpressProductResult {
    return {
      status: overrides.status,
      body: {
        success: false,
        mtopRet: null,
        productId: '1005010519851506',
        productName: null,
        skuCount: 0,
        skuPrices: [],
        store: null,
        publication: null,
        products: [],
        errorType: 'upstream',
        errorCode: overrides.errorCode ?? null,
        upstreamStatus: overrides.upstreamStatus ?? null,
        session: null,
      },
    };
  }

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

    await expect(
      lookupAliExpressProduct('1005010519851506', requestProduct, repository),
    ).resolves.toEqual({
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
            productId: '9f98dbb8-99f6-4058-96f0-9577322cffdb',
            isImported: true,
          },
        ],
      },
    });
  });

  it('explains when it cannot connect to AliExpress', async () => {
    const requestProduct = vi.fn().mockResolvedValue(failedProductRequest({ status: 502 }));

    await expect(
      lookupAliExpressProduct('1005010519851506', requestProduct, repository),
    ).resolves.toEqual({
      status: 502,
      body: {
        code: 'ALIEXPRESS_CONNECTION_FAILED',
        message:
          'No se pudo conectar con AliExpress. Comprueba la conexión del servidor e inténtalo de nuevo.',
      },
    });
  });

  it('explains when the AliExpress session must be renewed', async () => {
    const requestProduct = vi
      .fn()
      .mockResolvedValue(
        failedProductRequest({ status: 502, errorCode: 'ALIEXPRESS_SESSION_REAUTH_REQUIRED' }),
      );

    await expect(
      lookupAliExpressProduct('1005010519851506', requestProduct, repository),
    ).resolves.toEqual({
      status: 503,
      body: {
        code: 'ALIEXPRESS_SESSION_REAUTH_REQUIRED',
        message:
          'La sesión de AliExpress ha caducado o ha sido rechazada. Actualiza la cookie de AliExpress e inicializa de nuevo la sesión.',
      },
    });
  });

  it('distinguishes an unavailable AliExpress service from a rejected request', async () => {
    const unavailableRequest = vi
      .fn()
      .mockResolvedValue(failedProductRequest({ status: 502, upstreamStatus: 503 }));
    const rejectedRequest = vi
      .fn()
      .mockResolvedValue(failedProductRequest({ status: 502, upstreamStatus: 400 }));

    await expect(
      lookupAliExpressProduct('1005010519851506', unavailableRequest, repository),
    ).resolves.toMatchObject({
      status: 503,
      body: { code: 'ALIEXPRESS_UPSTREAM_UNAVAILABLE' },
    });
    await expect(
      lookupAliExpressProduct('1005010519851506', rejectedRequest, repository),
    ).resolves.toMatchObject({
      status: 502,
      body: { code: 'ALIEXPRESS_UPSTREAM_REJECTED' },
    });
  });
});
