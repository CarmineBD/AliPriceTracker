import request from 'supertest';
import { CookieJar } from 'tough-cookie';
import { describe, expect, it, vi } from 'vitest';

import { app } from '../src/app';
import {
  createMtopSignature,
  debugAliExpressProduct,
} from '../src/modules/aliexpress-debug/aliexpress-debug.service';
import type { AliExpressSessionContext } from '../src/modules/aliexpress-debug/aliexpress-session.service';

const productId = '1005010519851506';
const validMtopBody =
  'mtopjsonp1({"ret":["SUCCESS::ok"],"data":{"result":{"PRODUCT_TITLE":{"text":"Producto de prueba"},"PRICE":{"skuPriceInfoMap":{}},"SKU":{"skuPaths":[]},"QUANTITY_PC":{"allSkuQuantityView":{}},"HEADER_IMAGE_PC":{"skuImagesMap":{}}}}});';

function createSessionRunner() {
  const persist = vi.fn().mockResolvedValue(undefined);
  const context: AliExpressSessionContext = {
    jar: new CookieJar(),
    source: 'database',
    getToken: vi.fn().mockResolvedValue({
      token: 'test-token',
      expiresAt: '2027-01-01T00:00:00.000Z',
    }),
    persist,
  };

  return {
    context,
    sessionRunner: {
      withSession: async <T>(operation: (session: AliExpressSessionContext) => Promise<T>) =>
        operation(context),
    },
  };
}

describe('GET /api/debug/aliexpress/product/:productId', () => {
  it('rejects a non-numeric product identifier before making an upstream request', async () => {
    const response = await request(app)
      .get('/api/debug/aliexpress/product/not-a-number')
      .set('x-debug-api-key', 'test-debug-api-key');

    expect(response.status).toBe(400);
    expect(response.body.errorType).toBe('validation');
  });

  it('requires the debug API key before loading a session', async () => {
    const response = await request(app).get(`/api/debug/aliexpress/product/${productId}`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      productId,
      errorType: 'validation',
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

  it('retries exactly once after a token error', async () => {
    const { context, sessionRunner } = createSessionRunner();
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          status: 200,
          data: 'mtopjsonp1({"ret":["FAIL_SYS_TOKEN_EXPIRED::expired"]});',
        })
        .mockResolvedValueOnce({ status: 200, data: validMtopBody }),
    };

    const result = await debugAliExpressProduct(
      { productId, debugApiKey: 'test-debug-api-key' },
      { sessionRunner, client },
    );

    expect(client.get).toHaveBeenCalledTimes(2);
    expect(context.persist).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
    expect(result.body.session).toEqual({
      source: 'database',
      tokenExpiresAt: '2027-01-01T00:00:00.000Z',
      retriedAfterTokenRefresh: true,
    });
  });

  it('does not retry when AliExpress requires user validation', async () => {
    const { sessionRunner } = createSessionRunner();
    const client = {
      get: vi.fn().mockResolvedValue({
        status: 200,
        data: 'mtopjsonp1({"ret":["FAIL_SYS_USER_VALIDATE::captcha"]});',
      }),
    };

    const result = await debugAliExpressProduct(
      { productId, debugApiKey: 'test-debug-api-key' },
      { sessionRunner, client },
    );

    expect(client.get).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(502);
    expect(result.body.errorCode).toBe('ALIEXPRESS_SESSION_REAUTH_REQUIRED');
  });
});
