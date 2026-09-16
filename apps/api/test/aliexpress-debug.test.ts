import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { app } from '../src/app';
import {
  createMtopSignature,
  debugAliExpressProduct,
} from '../src/modules/aliexpress-debug/aliexpress-debug.service';
import {
  applySetCookies,
  getMtopTokenFromCookieMap,
  type AliExpressSessionContext,
  type CookieMap,
} from '../src/modules/aliexpress-debug/aliexpress-session.service';
import { aliexpressSessionService } from '../src/modules/aliexpress-debug/aliexpress-session.service';

const productId = '1005010519851506';
const validMtopBody =
  'mtopjsonp1({"ret":["SUCCESS::ok"],"data":{"result":{"PRODUCT_TITLE":{"text":"Producto de prueba"},"PRICE":{"skuPriceInfoMap":{}},"SKU":{"skuPaths":[]},"QUANTITY_PC":{"allSkuQuantityView":{}},"HEADER_IMAGE_PC":{"skuImagesMap":{}}}}});';

const variantsMtopBody = `mtopjsonp1(${JSON.stringify({
  ret: ['SUCCESS::ok'],
  data: {
    result: {
      SKU: {
        skuPaths: [
          {
            skuIdStr: 'sku-29',
            skuAttr: '14:29#DJI Neo2;200007763:201336342',
            skuStock: 222,
            salable: true,
          },
          {
            skuIdStr: 'sku-175',
            skuAttr: '14:175#DJI Neo2 Combo-Only Drone;200007763:201336342',
            skuStock: 165,
            salable: true,
          },
          {
            skuIdStr: 'sku-193',
            skuAttr: '14:193#Fly Combo-YKTZ;200007763:201336342',
            skuStock: 46,
            salable: true,
          },
        ],
        skuProperties: [
          {
            skuPropertyId: 14,
            skuPropertyName: 'Color',
            skuPropertyValues: [
              {
                propertyValueIdLong: 29,
                propertyValueDefinitionName: 'DJI Neo2',
                propertyValueDisplayName: 'BLANCO',
              },
              {
                propertyValueIdLong: 175,
                propertyValueDefinitionName: 'DJI Neo2 Combo-Only Drone',
                propertyValueDisplayName: 'verde',
              },
              {
                propertyValueIdLong: 193,
                propertyValueDefinitionName: 'Fly Combo-YKTZ',
                propertyValueDisplayName: 'Negro',
              },
            ],
          },
          {
            skuPropertyId: 200007763,
            skuPropertyName: 'Ships from',
            skuPropertyValues: [
              { propertyValueIdLong: 201336342, propertyValueDisplayName: 'Francia' },
            ],
          },
        ],
      },
      PRICE: { skuPriceInfoMap: {} },
      QUANTITY_PC: { allSkuQuantityView: {} },
      HEADER_IMAGE_PC: { skuImagesMap: {} },
    },
  },
})});`;

const completeProductMtopBody = `mtopjsonp1(${JSON.stringify({
  ret: ['SUCCESS::ok'],
  data: {
    result: {
      PRODUCT_TITLE: { text: 'DJI Neo2 Drone Fly Camera' },
      GLOBAL_DATA: {
        globalData: {
          subject: 'Título alternativo',
          productInfo: {
            productId,
            detailUrl: `https://www.aliexpress.com/item/${productId}.html`,
          },
        },
      },
      SHOP_CARD_PC: {
        storeName: 'Euro Frame Store',
        sellerInfo: { storeNum: 1104930936, countryCompleteName: 'France' },
        benefitInfoList: [
          { title: 'Store Rating', value: '4.9' },
          { title: '# Sold in 180 Days', value: '20,000+' },
        ],
      },
      PC_RATING: { otherText: '4.000+ vendido(s)', rating: '4.7', totalValidNum: 777 },
      SKU: {
        skuPaths: [
          {
            skuId: 12000052796795560,
            skuIdStr: '12000052796795561',
            skuAttr: '14:175#DJI Neo2 Combo-Only Drone',
            skuStock: 165,
            salable: true,
          },
        ],
        skuProperties: [
          {
            skuPropertyId: 14,
            skuPropertyName: 'Color',
            skuPropertyValues: [
              {
                propertyValueIdLong: 175,
                propertyValueDefinitionName: 'DJI Neo2 Combo-Only Drone',
              },
            ],
          },
        ],
      },
      PRICE: {
        skuIdStrPriceInfoMap: {
          '12000052796795561': { salePriceString: '273,69€' },
        },
      },
      QUANTITY_PC: { allSkuQuantityView: { '12000052796795561': { maxBuyCount: 1 } } },
      HEADER_IMAGE_PC: {
        skuImagesMap: { '12000052796795561': ['https://example.test/drone.jpg'] },
      },
    },
  },
})});`;

function createSessionRunner(cookies: CookieMap) {
  const context: AliExpressSessionContext = {
    cookies,
    source: 'database',
    getToken: () => getMtopTokenFromCookieMap(cookies),
    applySetCookies: async (setCookieHeaders) => applySetCookies(cookies, setCookieHeaders),
  };

  return {
    context,
    sessionRunner: {
      withSession: async <T>(operation: (session: AliExpressSessionContext) => Promise<T>) =>
        operation(context),
    },
  };
}

function response(status: number, body: string, setCookie?: string) {
  return {
    status,
    headers: new Headers(setCookie ? { 'set-cookie': setCookie } : undefined),
    text: async () => body,
  };
}

describe('GET /api/debug/aliexpress/product/:productId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a non-numeric product identifier before making an upstream request', async () => {
    const result = await request(app)
      .get('/api/debug/aliexpress/product/not-a-number')
      .set('x-debug-api-key', 'test-debug-api-key');

    expect(result.status).toBe(400);
    expect(result.body.errorType).toBe('validation');
  });

  it('requires the debug API key before loading a session', async () => {
    const result = await request(app).get(`/api/debug/aliexpress/product/${productId}`);

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      success: false,
      productId,
      errorType: 'validation',
    });
  });

  it('reseeds the session through the protected debug route', async () => {
    vi.spyOn(aliexpressSessionService, 'reseed').mockResolvedValue({
      cookieCount: 2,
      tokenExpiresAt: '2030-01-01T00:00:00.000Z',
    });

    const result = await request(app)
      .post('/api/debug/aliexpress/session/reseed')
      .set('x-debug-api-key', 'test-debug-api-key');

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      session: {
        source: 'reseed',
        cookieCount: 2,
        tokenExpiresAt: '2030-01-01T00:00:00.000Z',
      },
    });
  });

  it('creates the expected MTop signature', () => {
    expect(
      createMtopSignature({
        token: 'token-value',
        t: '1700000000000',
        dataString: '{"productId":"1005010519851506"}',
      }),
    ).toBe('07121cd3155217564b301f83c992dc26');
  });

  it('returns the original parsed MTop response when requested', async () => {
    const { sessionRunner } = createSessionRunner({
      _m_h5_tk: 'token_1893456000000',
    });
    const client = vi.fn().mockResolvedValue(response(200, validMtopBody));

    const result = await debugAliExpressProduct(
      { productId, debugApiKey: 'test-debug-api-key', includeRaw: true },
      { sessionRunner, client },
    );

    expect(result.status).toBe(200);
    expect(result.body.rawResponse).toMatchObject({
      ret: ['SUCCESS::ok'],
      data: { result: { PRODUCT_TITLE: { text: 'Producto de prueba' } } },
    });
  });

  it('uses the AliExpress variant definition names in parsed SKU names', async () => {
    const { sessionRunner } = createSessionRunner({ _m_h5_tk: 'token_1893456000000' });
    const client = vi.fn().mockResolvedValue(response(200, variantsMtopBody));

    const result = await debugAliExpressProduct(
      { productId, debugApiKey: 'test-debug-api-key' },
      { sessionRunner, client },
    );

    expect(result.status).toBe(200);
    expect(result.body.skuPrices.map(({ variantName }) => variantName)).toEqual([
      'DJI Neo2',
      'DJI Neo2 Combo-Only Drone',
      'Fly Combo-YKTZ',
    ]);
  });

  it('parses the store, publication, and SKU data without losing the string SKU identifier', async () => {
    const { sessionRunner } = createSessionRunner({ _m_h5_tk: 'token_1893456000000' });
    const client = vi.fn().mockResolvedValue(response(200, completeProductMtopBody));

    const result = await debugAliExpressProduct(
      { productId, debugApiKey: 'test-debug-api-key' },
      { sessionRunner, client },
    );

    expect(result.status).toBe(200);
    expect(result.body.store).toEqual({
      aliexpressStoreId: '1104930936',
      name: 'Euro Frame Store',
      location: 'France',
      reviewScore: 4.9,
      sales180d: '20,000+',
    });
    expect(result.body.publication).toEqual({
      aliexpressProductId: productId,
      name: 'DJI Neo2 Drone Fly Camera',
      url: `https://www.aliexpress.com/item/${productId}.html`,
      salesCount: '4.000+',
      reviewScore: 4.7,
      reviewCount: 777,
    });
    expect(result.body.products).toEqual([
      {
        aliexpressSkuId: '12000052796795561',
        variantName: 'DJI Neo2 Combo-Only Drone',
        price: '273,69€',
        quantityAvailable: 165,
        maxPurchase: 1,
        imageUrl: 'https://example.test/drone.jpg',
        salable: true,
      },
    ]);
  });

  it('retries once using the token received in Set-Cookie', async () => {
    const { context, sessionRunner } = createSessionRunner({
      _m_h5_tk: 'old-token_1893456000000',
      other: 'value=kept',
    });
    const client = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          200,
          'mtopjsonp1({"ret":["FAIL_SYS_TOKEN_EXPIRED::expired"]});',
          '_m_h5_tk=new-token_1893456000000; Path=/; HttpOnly',
        ),
      )
      .mockResolvedValueOnce(response(200, validMtopBody));

    const result = await debugAliExpressProduct(
      { productId, debugApiKey: 'test-debug-api-key', includeRaw: true },
      { sessionRunner, client },
    );

    expect(client).toHaveBeenCalledTimes(2);
    expect(context.cookies._m_h5_tk).toBe('new-token_1893456000000');
    expect((client.mock.calls[1]?.[1]?.headers as Record<string, string>).Cookie).toBe(
      '_m_h5_tk=new-token_1893456000000; other=value=kept',
    );
    expect(result.status).toBe(200);
    expect(result.body.session).toEqual({
      source: 'database',
      tokenExpiresAt: '2030-01-01T00:00:00.000Z',
      retriedAfterTokenRefresh: true,
      cookieCount: 2,
    });
  });

  it('does not retry when AliExpress returns FAIL_SYS_ILLEGAL_ACCESS', async () => {
    const { sessionRunner } = createSessionRunner({
      _m_h5_tk: 'token_1893456000000',
    });
    const client = vi
      .fn()
      .mockResolvedValue(
        response(200, 'mtopjsonp1({"ret":["FAIL_SYS_ILLEGAL_ACCESS::invalid session"]});'),
      );

    const result = await debugAliExpressProduct(
      { productId, debugApiKey: 'test-debug-api-key', includeRaw: true },
      { sessionRunner, client },
    );

    expect(client).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(502);
    expect(result.body.errorCode).toBe('ALIEXPRESS_SESSION_REAUTH_REQUIRED');
    expect(result.body.rawResponse).toEqual({
      ret: ['FAIL_SYS_ILLEGAL_ACCESS::invalid session'],
    });
  });
});
