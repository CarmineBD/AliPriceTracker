import { createHash, timingSafeEqual } from 'node:crypto';

import { env } from '../../config/env';

const appKey = '12574478';
const endpoint = 'https://acs.aliexpress.com/h5/mtop.aliexpress.pdp.pc.query/1.0/';

type JsonRecord = Record<string, unknown>;

type DebugShape = {
  topLevelKeys: string[];
  dataKeys: string[];
  resultKeys: string[];
  resultPreview: string;
};

type DebugResponse = {
  success: boolean;
  mtopRet: string[] | null;
  productId: string;
  productName: string | null;
  skuCount: number;
  skuPrices: Array<{ skuId: string; price: unknown }>;
  debugShape: DebugShape | null;
  errorType: 'token' | 'validation' | 'upstream' | null;
  upstreamStatus: number | null;
};

type DebugResult = {
  status: 200 | 401 | 502 | 503;
  body: DebugResponse;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const getRet = (body: JsonRecord): string[] | null =>
  Array.isArray(body.ret) && body.ret.every((entry) => typeof entry === 'string')
    ? body.ret
    : null;

const createResponse = (
  productId: string,
  overrides: Partial<DebugResponse> = {},
): DebugResponse => ({
  success: false,
  mtopRet: null,
  productId,
  productName: null,
  skuCount: 0,
  skuPrices: [],
  debugShape: null,
  errorType: 'upstream',
  upstreamStatus: null,
  ...overrides,
});

export function logAliExpressDebug(event: string, fields: Record<string, unknown>) {
  console.info(JSON.stringify({ event, ...fields }));
}

function hasMatchingApiKey(providedKey: string | undefined): boolean {
  if (!providedKey || !env.DEBUG_API_KEY) {
    return false;
  }

  const digest = (value: string) => createHash('sha256').update(value).digest();
  const provided = digest(providedKey);
  const expected = digest(env.DEBUG_API_KEY);

  return timingSafeEqual(provided, expected);
}

function getMtopToken(cookie: string): string | null {
  const match = /(?:^|;\s*)_m_h5_tk=([^;]*)/.exec(cookie);

  if (!match?.[1]) {
    return null;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(match[1]);
  } catch {
    return null;
  }

  const lastUnderscore = decoded.lastIndexOf('_');
  return lastUnderscore > 0 ? decoded.slice(0, lastUnderscore) : null;
}

function parseJsonp(body: string): JsonRecord | null {
  const match = /^\s*mtopjsonp1\(([\s\S]*)\)\s*;?\s*$/.exec(body);

  if (!match?.[1]) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(match[1]);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getProductDetails(body: JsonRecord) {
  const rootData = isRecord(body.data) ? body.data : null;
  const data = rootData && isRecord(rootData.data) ? rootData.data : rootData;
  const product = data && isRecord(data.PRODUCT) ? data.PRODUCT : null;
  const title = data && isRecord(data.TITLE) ? data.TITLE : null;
  const price = data && isRecord(data.PRICE) ? data.PRICE : null;
  const skuPriceInfoMap = price && isRecord(price.skuPriceInfoMap) ? price.skuPriceInfoMap : {};
  const skuEntries = Object.entries(skuPriceInfoMap);

  return {
    productName:
      getString(product?.productTitle) ??
      getString(product?.title) ??
      getString(title?.productTitle) ??
      getString(title?.subject) ??
      null,
    skuCount: skuEntries.length,
    skuPrices: skuEntries.slice(0, 5).map(([skuId, priceInfo]) => ({ skuId, price: priceInfo })),
  };
}

function getDebugShape(body: JsonRecord): DebugShape {
  const data = isRecord(body.data) ? body.data : {};
  const result = data.result ?? {};

  return {
    topLevelKeys: Object.keys(body),
    dataKeys: Object.keys(data),
    resultKeys: isRecord(result) ? Object.keys(result) : [],
    resultPreview: JSON.stringify(result).slice(0, 8000),
  };
}

function getErrorType(ret: string[] | null, upstreamStatus: number): 'token' | 'upstream' | null {
  if (ret?.some((entry) => entry.toUpperCase().includes('TOKEN'))) {
    return 'token';
  }

  if (!ret?.some((entry) => entry.startsWith('SUCCESS')) || !upstreamStatus.toString().startsWith('2')) {
    return 'upstream';
  }

  return null;
}

export async function debugAliExpressProduct({
  productId,
  debugApiKey,
}: {
  productId: string;
  debugApiKey: string | undefined;
}): Promise<DebugResult> {
  if (!hasMatchingApiKey(debugApiKey)) {
    logAliExpressDebug('aliexpress_debug_error', { productId, errorType: 'validation' });
    return { status: 401, body: createResponse(productId, { errorType: 'validation' }) };
  }

  if (!env.ALIEXPRESS_COOKIE) {
    logAliExpressDebug('aliexpress_debug_error', { productId, errorType: 'validation' });
    return { status: 503, body: createResponse(productId, { errorType: 'validation' }) };
  }

  const token = getMtopToken(env.ALIEXPRESS_COOKIE);
  if (!token) {
    logAliExpressDebug('aliexpress_debug_error', { productId, errorType: 'validation' });
    return { status: 503, body: createResponse(productId, { errorType: 'validation' }) };
  }

  const t = Date.now().toString();
  const data = {
    productId,
    _lang: 'es_ES',
    _currency: 'EUR',
    country: 'ES',
    province: '919967846682000000',
    city: '919967846682127000',
    channel: '',
    pdp_ext_f: '{"order":"4603","eval":"1","fromPage":"search"}',
    sourceType: '',
    clientType: 'pc',
    ext: '{"site":"esp","crawler":false,"signedIn":true,"host":"es.aliexpress.com"}',
  };
  const dataString = JSON.stringify(data);
  const sign = createHash('md5').update(`${token}&${t}&${appKey}&${dataString}`).digest('hex');
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    jsv: '2.5.1',
    appKey,
    t,
    sign,
    api: 'mtop.aliexpress.pdp.pc.query',
    type: 'originaljsonp',
    v: '1.0',
    timeout: '15000',
    dataType: 'originaljsonp',
    callback: 'mtopjsonp1',
    data: dataString,
  }).toString();

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 15_000);

  try {
    const upstreamResponse = await fetch(url, {
      headers: {
        Accept: '*/*',
        Referer: 'https://es.aliexpress.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
        Cookie: env.ALIEXPRESS_COOKIE,
      },
      signal: abortController.signal,
    });
    const upstreamStatus = upstreamResponse.status;
    logAliExpressDebug('aliexpress_debug_upstream_status', { productId, upstreamStatus });

    const body = parseJsonp(await upstreamResponse.text());
    if (!body) {
      logAliExpressDebug('aliexpress_debug_error', { productId, errorType: 'upstream' });
      return {
        status: 502,
        body: createResponse(productId, { upstreamStatus, errorType: 'upstream' }),
      };
    }

    const mtopRet = getRet(body);
    logAliExpressDebug('aliexpress_debug_mtop_ret', { productId, mtopRet });
    const errorType = getErrorType(mtopRet, upstreamStatus);

    if (errorType) {
      logAliExpressDebug('aliexpress_debug_error', { productId, errorType });
    }

    return {
      status: errorType === null ? 200 : 502,
      body: createResponse(productId, {
        success: errorType === null,
        mtopRet,
        ...getProductDetails(body),
        debugShape: getDebugShape(body),
        errorType,
        upstreamStatus,
      }),
    };
  } catch {
    logAliExpressDebug('aliexpress_debug_error', { productId, errorType: 'upstream' });
    return { status: 502, body: createResponse(productId, { errorType: 'upstream' }) };
  } finally {
    clearTimeout(timeout);
  }
}
