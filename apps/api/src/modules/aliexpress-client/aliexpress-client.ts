import { createHash } from 'node:crypto';

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

export type AliExpressSessionDiagnostic = {
  source: AliExpressSessionSource;
  tokenExpiresAt: string | null;
  retriedAfterTokenRefresh: boolean;
  cookieCount: number;
};

type SkuPrice = {
  skuId: string;
  variantName: string | null;
  price: string | null;
  priceAmount: number | null;
  currency: string | null;
  stock: number | null;
  maxBuyCount: number | null;
  image: string | null;
  salable: boolean;
};

export type AliExpressStoreDetails = {
  aliexpressStoreId: string | null;
  name: string | null;
  location: string | null;
  reviewScore: number | null;
  sales180d: string | null;
};

export type AliExpressPublicationDetails = {
  aliexpressProductId: string;
  name: string | null;
  url: string | null;
  salesCount: string | null;
  reviewScore: number | null;
  reviewCount: number | null;
};

export type AliExpressSkuDetails = {
  aliexpressSkuId: string;
  variantName: string | null;
  price: string | null;
  priceAmount: number | null;
  currency: string | null;
  quantityAvailable: number | null;
  maxPurchase: number | null;
  imageUrl: string | null;
  salable: boolean;
};

export type AliExpressProductResponse = {
  success: boolean;
  mtopRet: string[] | null;
  productId: string;
  productName: string | null;
  skuCount: number;
  skuPrices: SkuPrice[];
  store: AliExpressStoreDetails | null;
  publication: AliExpressPublicationDetails | null;
  products: AliExpressSkuDetails[];
  errorType: 'token' | 'validation' | 'upstream' | 'reauth' | null;
  errorCode: 'ALIEXPRESS_SESSION_REAUTH_REQUIRED' | null;
  upstreamStatus: number | null;
  session: AliExpressSessionDiagnostic | null;
  rawResponse?: JsonRecord | null;
};

export type AliExpressProductResult = {
  status: 200 | 502 | 503;
  body: AliExpressProductResponse;
};

export type MtopHttpResponse = Pick<Response, 'status' | 'headers' | 'text'>;
export type MtopHttpClient = (url: URL, init: RequestInit) => Promise<MtopHttpResponse>;

export type AliExpressSessionRunner = Pick<AliExpressSessionService, 'withSession'>;
type AliExpressSessionReseeder = Pick<AliExpressSessionService, 'reseed'>;

export type AliExpressClientDependencies = {
  sessionRunner?: AliExpressSessionRunner;
  sessionService?: AliExpressSessionRunner & AliExpressSessionReseeder;
  httpClient?: MtopHttpClient;
};

const mtopHttpClient: MtopHttpClient = fetch;

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

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const asCurrencyCode = (value: unknown): string | null => {
  const currency = getString(value)?.trim().toUpperCase();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : null;
};

/** Parses AliExpress's visual price text; the final dot/comma is its decimal separator. */
export function parseAliExpressPriceAmount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const numericText = value
    .trim()
    .replace(/[^0-9,.'\s]/g, '')
    .replace(/[\s']/g, '');
  if (!numericText || !/\d/.test(numericText)) {
    return null;
  }

  const separators = [...numericText.matchAll(/[.,]/g)].map((match) => match.index ?? -1);
  const lastSeparator = separators.at(-1) ?? -1;
  const decimalDigits = lastSeparator === -1 ? 0 : numericText.length - lastSeparator - 1;
  const hasDecimalSeparator = decimalDigits > 0 && decimalDigits <= 2;
  const digits = numericText.replace(/[.,]/g, '');
  if (!digits) {
    return null;
  }

  const normalized = hasDecimalSeparator
    ? `${digits.slice(0, -decimalDigits)}.${digits.slice(-decimalDigits)}`
    : digits;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

const asIdentifierString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  return typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : null;
};

const getFirstImage = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  return Array.isArray(value)
    ? (value.find((image): image is string => typeof image === 'string' && image.trim() !== '') ??
        null)
    : null;
};

const getRet = (body: JsonRecord | null): string[] | null =>
  body && Array.isArray(body.ret) && body.ret.every((entry) => typeof entry === 'string')
    ? body.ret
    : null;

const createResponse = (
  productId: string,
  overrides: Partial<AliExpressProductResponse> = {},
): AliExpressProductResponse => ({
  success: false,
  mtopRet: null,
  productId,
  productName: null,
  skuCount: 0,
  skuPrices: [],
  store: null,
  publication: null,
  products: [],
  errorType: 'upstream',
  errorCode: null,
  upstreamStatus: null,
  session: null,
  ...overrides,
});

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
    .map(([propertyId, rawValueId]) => {
      const valueId = rawValueId?.split('#', 1)[0];
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
        (candidate) =>
          String(candidate.propertyValueIdLong ?? candidate.propertyValueId) === valueId,
      );

      return matchedValue
        ? (getString(matchedValue.propertyValueDefinitionName) ??
            getString(matchedValue.propertyValueDisplayName) ??
            getString(matchedValue.propertyValueName))
        : null;
    })
    .filter((name): name is string => name !== null);

  return names.join(' / ');
}

function getBenefitValue(
  benefitInfoList: JsonRecord[],
  matcher: (normalizedTitle: string) => boolean,
): string | null {
  for (const benefit of benefitInfoList) {
    const title = getString(benefit.title) ?? getString(benefit.name) ?? getString(benefit.label);
    const value = getString(benefit.value) ?? getString(benefit.text);
    if (title && value && matcher(normalizeLabel(title))) {
      return value;
    }
  }

  return null;
}

function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

function parseVisibleSalesCount(value: unknown): string | null {
  const text = getString(value)?.trim();
  if (!text) {
    return null;
  }

  return text.match(/\d(?:[\d.,\s]*\d)?\+?/)?.[0].trim() ?? null;
}

function parseAliExpressStore(shopCard: JsonRecord): AliExpressStoreDetails {
  const sellerInfo = isRecord(shopCard.sellerInfo) ? shopCard.sellerInfo : {};
  const benefitInfoList = asRecords(shopCard.benefitInfoList);
  const structuredReviewScore =
    asFiniteNumber(shopCard.reviewScore) ??
    asFiniteNumber(shopCard.storeRating) ??
    asFiniteNumber(sellerInfo.reviewScore) ??
    asFiniteNumber(sellerInfo.storeRating);
  const reviewScoreValue = getBenefitValue(benefitInfoList, (title) =>
    /rating|calificacion|valoracion|puntuacion|feedback/.test(title),
  );

  return {
    aliexpressStoreId: asIdentifierString(sellerInfo.storeNum),
    name: getString(shopCard.storeName),
    location: getString(sellerInfo.countryCompleteName),
    reviewScore: structuredReviewScore ?? asFiniteNumber(reviewScoreValue),
    sales180d: getBenefitValue(
      benefitInfoList,
      (title) => title.includes('180') && /sold|vendid|ventas|sales/.test(title),
    ),
  };
}

function parseAliExpressPublication({
  productId,
  productTitle,
  globalData,
  rating,
}: {
  productId: string;
  productTitle: JsonRecord;
  globalData: JsonRecord;
  rating: JsonRecord;
}): AliExpressPublicationDetails {
  const productInfo = isRecord(globalData.productInfo) ? globalData.productInfo : {};

  return {
    aliexpressProductId: asIdentifierString(productInfo.productId) ?? productId,
    name: getString(productTitle.text) ?? getString(globalData.subject),
    url: getString(productInfo.detailUrl),
    salesCount: parseVisibleSalesCount(rating.otherText),
    reviewScore: asFiniteNumber(rating.rating),
    reviewCount: asInteger(rating.totalValidNum),
  };
}

function getProductDetails(body: JsonRecord, productId: string) {
  const data = isRecord(body.data) ? body.data : {};
  const result = isRecord(data.result) ? data.result : {};
  const productTitle = isRecord(result.PRODUCT_TITLE) ? result.PRODUCT_TITLE : {};
  const globalDataContainer = isRecord(result.GLOBAL_DATA) ? result.GLOBAL_DATA : {};
  const globalData = isRecord(globalDataContainer.globalData) ? globalDataContainer.globalData : {};
  const globalCurrency =
    asCurrencyCode(globalData.currencyCode) ?? asCurrencyCode(globalData.currency);
  const shopCard = isRecord(result.SHOP_CARD_PC) ? result.SHOP_CARD_PC : {};
  const rating = isRecord(result.PC_RATING) ? result.PC_RATING : {};
  const sku = isRecord(result.SKU) ? result.SKU : {};
  const skuPaths = asRecords(sku.skuPaths);
  const skuProperties = asRecords(sku.skuProperties);
  const price = isRecord(result.PRICE) ? result.PRICE : {};
  const stringSkuPrices = isRecord(price.skuIdStrPriceInfoMap) ? price.skuIdStrPriceInfoMap : {};
  const legacySkuPrices = isRecord(price.skuPriceInfoMap) ? price.skuPriceInfoMap : {};
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

      const priceInfo = isRecord(stringSkuPrices[skuId])
        ? stringSkuPrices[skuId]
        : isRecord(legacySkuPrices[skuId])
          ? legacySkuPrices[skuId]
          : {};
      const quantityInfo = isRecord(quantities[skuId]) ? quantities[skuId] : {};
      // salePriceLocal can be a non-decimal internal value (for example, 17641764).
      // The displayed salePriceString is the source of truth for the amount we persist.
      const visualPrice = getString(priceInfo.salePriceString);
      const priceAmount = parseAliExpressPriceAmount(visualPrice);
      const currency =
        globalCurrency ??
        asCurrencyCode(priceInfo.currencyCode) ??
        asCurrencyCode(priceInfo.currency);

      return {
        skuId,
        variantName: resolveSkuVariantName(getString(skuPath.skuAttr) ?? '', skuProperties) || null,
        price: visualPrice,
        priceAmount,
        currency,
        stock: asInteger(skuPath.skuStock),
        maxBuyCount: asInteger(quantityInfo.maxBuyCount),
        image: getFirstImage(images[skuId]),
        salable: Boolean(skuPath.salable),
      };
    })
    .filter((skuPath): skuPath is SkuPrice => skuPath !== null)
    .slice(0, 10);

  const publication = parseAliExpressPublication({ productId, productTitle, globalData, rating });

  return {
    productName: publication.name,
    skuCount: skuPaths.length,
    skuPrices,
    store: parseAliExpressStore(shopCard),
    publication,
    products: skuPrices.map((skuPrice) => ({
      aliexpressSkuId: skuPrice.skuId,
      variantName: skuPrice.variantName ?? `SKU ${skuPrice.skuId}`,
      price: skuPrice.price,
      priceAmount: skuPrice.priceAmount,
      currency: skuPrice.currency,
      quantityAvailable: skuPrice.stock,
      maxPurchase: skuPrice.maxBuyCount,
      imageUrl: skuPrice.image,
      salable: skuPrice.salable,
    })),
  };
}

export function isMtopTokenError(ret: string[] | null): boolean {
  return (
    ret?.some((entry) => {
      const code = entry.toUpperCase();
      return (
        code.includes('FAIL_SYS_TOKEN') ||
        code.includes('TOKEN_EXPIRED') ||
        code.includes('TOKEN_EXOIRED')
      );
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
  return (
    upstreamStatus >= 200 &&
    upstreamStatus < 300 &&
    (ret?.some((entry) => entry.startsWith('SUCCESS')) ?? false)
  );
}

async function getSessionDiagnostic(
  session: AliExpressSessionContext,
  retriedAfterTokenRefresh: boolean,
): Promise<AliExpressSessionDiagnostic> {
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

  await session.applySetCookies(getSetCookieHeaders(response.headers));

  return {
    upstreamStatus: response.status,
    body: parseJsonp(await response.text()),
    missingToken: false,
  };
}

function createReauthResponse({
  productId,
  upstreamStatus,
  mtopRet,
  session,
  rawResponse,
}: {
  productId: string;
  upstreamStatus: number | null;
  mtopRet: string[] | null;
  session: AliExpressSessionDiagnostic;
  rawResponse?: JsonRecord | null;
}): AliExpressProductResult {
  return {
    status: 502,
    body: createResponse(productId, {
      mtopRet,
      errorType: 'reauth',
      errorCode: 'ALIEXPRESS_SESSION_REAUTH_REQUIRED',
      upstreamStatus,
      session,
      rawResponse,
    }),
  };
}

async function getAliExpressProduct(
  {
    productId,
    includeRaw = false,
  }: {
    productId: string;
    includeRaw?: boolean;
  },
  {
    sessionRunner = aliexpressSessionService,
    client = mtopHttpClient,
  }: {
    sessionRunner?: AliExpressSessionRunner;
    client?: MtopHttpClient;
  } = {},
): Promise<AliExpressProductResult> {
  try {
    return await sessionRunner.withSession(async (session) => {
      try {
        const firstAttempt = await requestMtopProduct({ productId, session, client });
        const firstRet = getRet(firstAttempt.body);
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
            rawResponse: includeRaw ? firstAttempt.body : undefined,
          });
        }

        if (isMtopTokenError(firstRet)) {
          if (!session.getToken()) {
            return createReauthResponse({
              productId,
              upstreamStatus: firstAttempt.upstreamStatus,
              mtopRet: firstRet,
              session: firstSessionDiagnostic,
              rawResponse: includeRaw ? firstAttempt.body : undefined,
            });
          }

          const secondAttempt = await requestMtopProduct({ productId, session, client });
          const secondRet = getRet(secondAttempt.body);
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
              rawResponse: includeRaw ? secondAttempt.body : undefined,
            });
          }

          return {
            status: 200,
            body: createResponse(productId, {
              success: true,
              mtopRet: secondRet,
              ...getProductDetails(secondAttempt.body!, productId),
              errorType: null,
              upstreamStatus: secondAttempt.upstreamStatus,
              session: secondSessionDiagnostic,
              rawResponse: includeRaw ? secondAttempt.body : undefined,
            }),
          };
        }

        if (
          !firstAttempt.body ||
          !isSuccessfulMtopResponse(firstRet, firstAttempt.upstreamStatus ?? 0)
        ) {
          return {
            status: 502,
            body: createResponse(productId, {
              mtopRet: firstRet,
              errorType: 'upstream',
              upstreamStatus: firstAttempt.upstreamStatus,
              session: firstSessionDiagnostic,
              rawResponse: includeRaw ? firstAttempt.body : undefined,
            }),
          };
        }

        return {
          status: 200,
          body: createResponse(productId, {
            success: true,
            mtopRet: firstRet,
            ...getProductDetails(firstAttempt.body, productId),
            errorType: null,
            upstreamStatus: firstAttempt.upstreamStatus,
            session: firstSessionDiagnostic,
            rawResponse: includeRaw ? firstAttempt.body : undefined,
          }),
        };
      } catch {
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
    return { status: 503, body: createResponse(productId, { errorType: 'upstream' }) };
  }
}

export class AliExpressClient {
  private readonly sessionRunner: AliExpressSessionRunner;
  private readonly sessionService: AliExpressSessionReseeder;
  private readonly httpClient: MtopHttpClient;

  constructor({
    sessionRunner,
    sessionService = aliexpressSessionService,
    httpClient = mtopHttpClient,
  }: AliExpressClientDependencies = {}) {
    this.sessionRunner = sessionRunner ?? sessionService;
    this.sessionService = sessionService;
    this.httpClient = httpClient;
  }

  getProduct(
    productId: string,
    { includeRaw = false }: { includeRaw?: boolean } = {},
  ): Promise<AliExpressProductResult> {
    return getAliExpressProduct(
      { productId, includeRaw },
      { sessionRunner: this.sessionRunner, client: this.httpClient },
    );
  }

  reseedSession(): Promise<{ cookieCount: number; tokenExpiresAt: string | null }> {
    return this.sessionService.reseed();
  }
}

export const aliexpressClient = new AliExpressClient();
