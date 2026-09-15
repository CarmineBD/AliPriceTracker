import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { app } from '../src/app';

describe('GET /api/debug/aliexpress/product/:productId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a non-numeric product identifier before making an upstream request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app)
      .get('/api/debug/aliexpress/product/not-a-number')
      .set('x-debug-api-key', 'test-debug-api-key');

    expect(response.status).toBe(400);
    expect(response.body.errorType).toBe('validation');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires the debug API key before making an upstream request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app).get('/api/debug/aliexpress/product/1005010519851506');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      productId: '1005010519851506',
      errorType: 'validation',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses a successful JSONP MTop response without exposing request credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        'mtopjsonp1({"ret":["SUCCESS::ok"],"data":{"result":{"PRODUCT_TITLE":{"text":"Producto de prueba"},"GLOBAL_DATA":{"globalData":{"subject":"Nombre alternativo"}},"PRICE":{"skuPriceInfoMap":{"1000000000000000001":{"salePriceString":"1,00 €"},"1000000000000000002":{"salePriceString":"2,00 €"}}},"SKU":{"skuProperties":[{"skuPropertyId":"14","skuPropertyName":"Color","skuPropertyValues":[{"propertyValueIdLong":"771","propertyValueDisplayName":"Rojo"}]},{"skuPropertyId":"200007763","skuPropertyName":"Envíos desde","skuPropertyValues":[{"propertyValueIdLong":"201336100","propertyValueDisplayName":"España"}]}],"skuPaths":[{"skuIdStr":"1000000000000000001","skuAttr":"14:771;200007763:201336100","skuStock":12,"salable":true},{"skuIdStr":"1000000000000000002","skuAttr":"14:771","skuStock":0,"salable":false}]},"QUANTITY_PC":{"allSkuQuantityView":{"1000000000000000001":{"maxBuyCount":3}}},"HEADER_IMAGE_PC":{"skuImagesMap":{"1000000000000000001":["https://image.example.test/red.jpg"]}}}}});',
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app)
      .get('/api/debug/aliexpress/product/1005010519851506')
      .set('x-debug-api-key', 'test-debug-api-key');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      mtopRet: ['SUCCESS::ok'],
      productId: '1005010519851506',
      productName: 'Producto de prueba',
      skuCount: 2,
      skuPrices: [
        {
          skuId: '1000000000000000001',
          name: 'Rojo',
          price: '1,00 €',
          stock: 12,
          maxBuyCount: 3,
          image: 'https://image.example.test/red.jpg',
          salable: true,
        },
        {
          skuId: '1000000000000000002',
          name: 'Rojo',
          price: '2,00 €',
          stock: 0,
          maxBuyCount: null,
          image: null,
          salable: false,
        },
      ],
      debugShape: {
        topLevelKeys: ['ret', 'data'],
        dataKeys: ['result'],
        resultKeys: [
          'PRODUCT_TITLE',
          'GLOBAL_DATA',
          'PRICE',
          'SKU',
          'QUANTITY_PC',
          'HEADER_IMAGE_PC',
        ],
      },
      errorType: null,
      upstreamStatus: 200,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(response.body)).not.toContain('test-token');
    expect(JSON.stringify(response.body)).not.toContain('test-debug-api-key');
  });
});
