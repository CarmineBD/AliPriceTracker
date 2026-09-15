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
        'mtopjsonp1({"ret":["SUCCESS::ok"],"data":{"data":{"PRODUCT":{"productTitle":"Producto de prueba"},"PRICE":{"skuPriceInfoMap":{"sku-a":{"skuAmount":"1.00"},"sku-b":{"skuAmount":"2.00"}}}}}});',
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
        { skuId: 'sku-a', price: { skuAmount: '1.00' } },
        { skuId: 'sku-b', price: { skuAmount: '2.00' } },
      ],
      debugShape: {
        topLevelKeys: ['ret', 'data'],
        dataKeys: ['data'],
        resultKeys: [],
        resultPreview: '{}',
      },
      errorType: null,
      upstreamStatus: 200,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(response.body)).not.toContain('test-token');
    expect(JSON.stringify(response.body)).not.toContain('test-debug-api-key');
  });
});
