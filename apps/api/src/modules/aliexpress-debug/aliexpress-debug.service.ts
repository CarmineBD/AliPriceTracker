import { createHash, timingSafeEqual } from 'node:crypto';

import { env } from '../../config/env';
import {
  AliExpressSessionService,
  aliexpressSessionService,
  type AliExpressSessionContext,
  type AliExpressSessionSource,
  buildCookieHeader,
} from './aliexpress-session.service';

const appKey = '12574478';
const endpoint = 'https://acs.aliexpress.com/h5/mtop.aliexpress.pdp.pc.query/1.0/';

type JsonRecord = Record<string, unknown>;

type SessionDiagnostic = {
  source: AliExpressSessionSource;
  tokenExpiresAt: string | null;
  retriedAfterTokenRefresh: boolean;
  cookieCount: number;
};

type SkuPrice = {
  skuId: string;
  name: string;
  price: string | null;
  stock: number;
  maxBuyCount: number | null;
  image: string | null;
  salable: boolean;
};

type DebugResponse = {
  success: boolean;
  mtopRet: string[] | null;
  productId: string;
  productName: string | null;
  skuCount: number;
  skuPrices: SkuPrice[];
  errorType: 'token' | 'validation' | 'upstream' | 'reauth' | null;
  errorCode: 'ALIEXPRESS_SESSION_REAUTH_REQUIRED' | null;
  upstreamStatus: number | null;
  session: SessionDiagnostic | null;
};

type DebugResult = {
  status: 200 | 401 | 502 | 503;
  body: DebugResponse;
};

type MtopHttpResponse = Pick<Response, 'status' | 'headers' | 'text'>;
type MtopHttpClient = (url: URL, init: RequestInit) => Promise<MtopHttpResponse>;

type SessionRunner = Pick<AliExpressSessionService, 'withSession'>;

const mtopHttpClient: MtopHttpClient = fetch;
const sessionService = aliexpressSessionService;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const asRecords = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const asInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
};

const getFirstImage = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  return Array.isArray(value)
    ? (value.find((image): image is string => typeof image === 'string' && image.trim() !== '') ?? null)
    : null;
};

const getRet = (body: JsonRecord | null): string[] | null =>
  body && Array.isArray(body.ret) && body.ret.every((entry) => typeof entry === 'string')
    ? body.ret
    : null;

const getMtopCode = (ret: string[] | null): string | null => ret?.[0]?.split('::', 1)[0] ?? null;

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
  errorType: 'upstream',
  errorCode: null,
  upstreamStatus: null,
  session: null,
  ...overrides,
});

export function logAliExpressDebug(event: string, fields: Record<string, unknown>) {
  console.info(JSON.stringify({ event, ...fields }));
}

export function hasMatchingDebugApiKey(providedKey: string | undefined): boolean {
  if (!providedKey || !env.DEBUG_API_KEY) {
    return false;
  }

  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(providedKey), digest(env.DEBUG_API_KEY));
}

export function createMtopSignature({
  token,
  t,
  dataString,
}: {
  token: string;
  t: string;
  dataString: string;
}): string {
  return createHash('md5').update(`${token}&${t}&${appKey}&${dataString}`).digest('hex');
}

function createMtopData(productId: string) {
  return {
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
}

function parseJsonp(body: unknown): JsonRecord | null {
  if (typeof body !== 'string') {
    return null;
  }

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

function resolveSkuVariantName(skuAttr: string, skuProperties: JsonRecord[]): string {
  const names = skuAttr
    .split(';')
    .map((attribute) => attribute.split(':', 2))
    .map(([propertyId, valueId]) => {
      if (!propertyId || valueId === undefined) {
        return null;
      }

      const property = skuProperties.find(
        (candidate) => String(candidate.skuPropertyId) === propertyId,
      );
      if (!property) {
        return null;
      }

      const propertyName = getString(property.skuPropertyName) ?? getString(property.propertyName);
      if (propertyName && /^(envíos desde|ships from)$/i.test(propertyName.trim())) {
        return null;
      }

      const values = asRecords(
        property.skuPropertyValues ?? property.propertyValues ?? property.values,
      );
      const matchedValue = values.find(
        (candidate) => String(candidate.propertyValueIdLong ?? candidate.propertyValueId) === valueId,
      );

      return matchedValue
        ? (getString(matchedValue.propertyValueDisplayName) ??
            getString(matchedValue.propertyValueName))
        : null;
    })
    .filter((name): name is string => name !== null);

  return names.join(' / ');
}

function getProductDetails(body: JsonRecord) {
  const data = isRecord(body.data) ? body.data : {};
  const result = isRecord(data.result) ? data.result : {};
  const productTitle = isRecord(result.PRODUCT_TITLE) ? result.PRODUCT_TITLE : {};
  const globalDataContainer = isRecord(result.GLOBAL_DATA) ? result.GLOBAL_DATA : {};
  const globalData = isRecord(globalDataContainer.globalData) ? globalDataContainer.globalData : {};
  const sku = isRecord(result.SKU) ? result.SKU : {};
  const skuPaths = asRecords(sku.skuPaths);
  const skuProperties = asRecords(sku.skuProperties);
  const price = isRecord(result.PRICE) ? result.PRICE : {};
  const prices = isRecord(price.skuPriceInfoMap) ? price.skuPriceInfoMap : {};
  const quantity = isRecord(result.QUANTITY_PC) ? result.QUANTITY_PC : {};
  const quantities = isRecord(quantity.allSkuQuantityView) ? quantity.allSkuQuantityView : {};
  const headerImage = isRecord(result.HEADER_IMAGE_PC) ? result.HEADER_IMAGE_PC : {};
  const images = isRecord(headerImage.skuImagesMap) ? headerImage.skuImagesMap : {};
  const skuPrices = skuPaths
    .map((skuPath): SkuPrice | null => {
      const skuId = getString(skuPath.skuIdStr);
      if (!skuId) {
        return null;
      }

      const priceInfo = isRecord(prices[skuId]) ? prices[skuId] : {};
      const quantityInfo = isRecord(quantities[skuId]) ? quantities[skuId] : {};

      return {
        skuId,
        name: resolveSkuVariantName(getString(skuPath.skuAttr) ?? '', skuProperties) || `SKU ${skuId}`,
        price: getString(priceInfo.salePriceString),
        stock: asInteger(skuPath.skuStock) ?? 0,
        maxBuyCount: asInteger(quantityInfo.maxBuyCount),
        image: getFirstImage(images[skuId]),
        salable: Boolean(skuPath.salable),
      };
    })
    .filter((skuPath): skuPath is SkuPrice => skuPath !== null)
    .slice(0, 10);

  return {
    productName: getString(productTitle.text) ?? getString(globalData.subject) ?? null,
    skuCount: skuPaths.length,
    skuPrices,
  };
}

export function isMtopTokenError(ret: string[] | null): boolean {
  return (
    ret?.some((entry) => {
      const code = entry.toUpperCase();
      return code.includes('FAIL_SYS_TOKEN') || code.includes('TOKEN_EXPIRED') || code.includes('TOKEN_EXOIRED');
    }) ?? false
  );
}

export function isMtopUserValidationError(ret: string[] | null): boolean {
  return ret?.some((entry) => entry.toUpperCase().includes('FAIL_SYS_USER_VALIDATE')) ?? false;
}

function isMtopSessionInvalidationError(ret: string[] | null): boolean {
  return (
    ret?.some((entry) => {
      const code = entry.toUpperCase();
      return code.includes('FAIL_SYS_SESSION_EXPIRED') || code.includes('FAIL_SYS_ILLEGAL_ACCESS');
    }) ?? false
  );
}

function isSuccessfulMtopResponse(ret: string[] | null, upstreamStatus: number): boolean {
  return upstreamStatus >= 200 && upstreamStatus < 300 && (ret?.some((entry) => entry.startsWith('SUCCESS')) ?? false);
}

async function getSessionDiagnostic(
  session: AliExpressSessionContext,
  retriedAfterTokenRefresh: boolean,
): Promise<SessionDiagnostic> {
  return {
    source: session.source,
    tokenExpiresAt: session.getToken()?.expiresAt ?? null,
    retriedAfterTokenRefresh,
    cookieCount: Object.keys(session.cookies).length,
  };
}

function getSetCookieHeaders(headers: Headers): string[] {
  const headersWithGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headersWithGetSetCookie.getSetCookie === 'function') {
    return headersWithGetSetCookie.getSetCookie();
  }

  const setCookie = headers.get('set-cookie');
  return setCookie ? [setCookie] : [];
}

async function requestMtopProduct({
  productId,
  session,
  client,
}: {
  productId: string;
  session: AliExpressSessionContext;
  client: MtopHttpClient;
}): Promise<{ upstreamStatus: number | null; body: JsonRecord | null; missingToken: boolean }> {
  const mtopToken = session.getToken();
  if (!mtopToken) {
    return { upstreamStatus: null, body: null, missingToken: true };
  }

  const t = Date.now().toString();
  const dataString = JSON.stringify(createMtopData(productId));
  const sign = createMtopSignature({ token: mtopToken.token, t, dataString });
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

  let response: MtopHttpResponse;
  try {
    response = await client(url, {
      headers: {
        Accept: '*/*',
        Referer: 'https://es.aliexpress.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
        Cookie: buildCookieHeader(session.cookies),
      },
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const changedCookieNames = await session.applySetCookies(getSetCookieHeaders(response.headers));
  if (changedCookieNames.length > 0) {
    logAliExpressDebug('aliexpress_debug_cookies_updated', {
      cookieCount: Object.keys(session.cookies).length,
      changedCookieNames,
    });
  }

  return { upstreamStatus: response.status, body: parseJsonp(await response.text()), missingToken: false };
}

function createReauthResponse({
  productId,
  upstreamStatus,
  mtopRet,
  session,
}: {
  productId: string;
  upstreamStatus: number | null;
  mtopRet: string[] | null;
  session: SessionDiagnostic;
}): DebugResult {
  logAliExpressDebug('aliexpress_debug_error', {
    mtopCode: getMtopCode(mtopRet) ?? 'ALIEXPRESS_SESSION_REAUTH_REQUIRED',
    retriedAfterTokenRefresh: session.retriedAfterTokenRefresh,
  });

  return {
    status: 502,
    body: createResponse(productId, {
      mtopRet,
      errorType: 'reauth',
      errorCode: 'ALIEXPRESS_SESSION_REAUTH_REQUIRED',
      upstreamStatus,
      session,
    }),
  };
}

export async function debugAliExpressProduct(
  {
    productId,
    debugApiKey,
  }: {
    productId: string;
    debugApiKey: string | undefined;
  },
  {
    sessionRunner = sessionService,
    client = mtopHttpClient,
  }: {
    sessionRunner?: SessionRunner;
    client?: MtopHttpClient;
  } = {},
): Promise<DebugResult> {
  if (!hasMatchingDebugApiKey(debugApiKey)) {
    logAliExpressDebug('aliexpress_debug_error', { mtopCode: 'VALIDATION_ERROR' });
    return { status: 401, body: createResponse(productId, { errorType: 'validation' }) };
  }

  try {
    return await sessionRunner.withSession(async (session) => {
      try {
        const firstAttempt = await requestMtopProduct({ productId, session, client });
        const firstRet = getRet(firstAttempt.body);
        logAliExpressDebug('aliexpress_debug_mtop_ret', {
          mtopCode: getMtopCode(firstRet),
          retriedAfterTokenRefresh: false,
        });
        const firstSessionDiagnostic = await getSessionDiagnostic(session, false);

        if (
          firstAttempt.missingToken ||
          isMtopUserValidationError(firstRet) ||
          isMtopSessionInvalidationError(firstRet)
        ) {
          return createReauthResponse({
            productId,
            upstreamStatus: firstAttempt.upstreamStatus,
            mtopRet: firstRet,
            session: firstSessionDiagnostic,
          });
        }

        if (isMtopTokenError(firstRet)) {
          if (!session.getToken()) {
            return createReauthResponse({
              productId,
              upstreamStatus: firstAttempt.upstreamStatus,
              mtopRet: firstRet,
              session: firstSessionDiagnostic,
            });
          }

          const secondAttempt = await requestMtopProduct({ productId, session, client });
          const secondRet = getRet(secondAttempt.body);
          logAliExpressDebug('aliexpress_debug_mtop_ret', {
            mtopCode: getMtopCode(secondRet),
            retriedAfterTokenRefresh: true,
          });
          const secondSessionDiagnostic = await getSessionDiagnostic(session, true);

          if (
            secondAttempt.missingToken ||
            isMtopUserValidationError(secondRet) ||
            isMtopSessionInvalidationError(secondRet) ||
            !isSuccessfulMtopResponse(secondRet, secondAttempt.upstreamStatus ?? 0)
          ) {
            return createReauthResponse({
              productId,
              upstreamStatus: secondAttempt.upstreamStatus,
              mtopRet: secondRet,
              session: secondSessionDiagnostic,
            });
          }

          return {
            status: 200,
            body: createResponse(productId, {
              success: true,
              mtopRet: secondRet,
              ...getProductDetails(secondAttempt.body!),
              errorType: null,
              upstreamStatus: secondAttempt.upstreamStatus,
              session: secondSessionDiagnostic,
            }),
          };
        }

        if (!firstAttempt.body || !isSuccessfulMtopResponse(firstRet, firstAttempt.upstreamStatus ?? 0)) {
          logAliExpressDebug('aliexpress_debug_error', {
            mtopCode: getMtopCode(firstRet) ?? 'UPSTREAM_ERROR',
            retriedAfterTokenRefresh: false,
          });
          return {
            status: 502,
            body: createResponse(productId, {
              mtopRet: firstRet,
              errorType: 'upstream',
              upstreamStatus: firstAttempt.upstreamStatus,
              session: firstSessionDiagnostic,
            }),
          };
        }

        return {
          status: 200,
          body: createResponse(productId, {
            success: true,
            mtopRet: firstRet,
            ...getProductDetails(firstAttempt.body),
            errorType: null,
            upstreamStatus: firstAttempt.upstreamStatus,
            session: firstSessionDiagnostic,
          }),
        };
      } catch {
        logAliExpressDebug('aliexpress_debug_error', { mtopCode: 'UPSTREAM_ERROR' });
        return {
          status: 502,
          body: createResponse(productId, {
            errorType: 'upstream',
            session: await getSessionDiagnostic(session, false),
          }),
        };
      }
    });
  } catch {
    logAliExpressDebug('aliexpress_debug_error', { mtopCode: 'UPSTREAM_ERROR' });
    return { status: 503, body: createResponse(productId, { errorType: 'upstream' }) };
  }
}
