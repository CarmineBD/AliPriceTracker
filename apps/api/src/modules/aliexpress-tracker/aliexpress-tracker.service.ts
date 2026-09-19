import {
  AliExpressClient,
  aliexpressClient,
  type AliExpressProductResult,
} from '../aliexpress-client/aliexpress-client.js';
import {
  AliExpressTrackerRepository,
  type PublicationObservation,
  type TrackedPublication,
} from './aliexpress-tracker.repository.js';

// Keep requests deliberately sparse. AliExpress can challenge sessions that make rapid,
// repeated MTop requests even when their authentication token has not expired.
const defaultDelayMilliseconds = 3_000;
const defaultUserValidationRetryDelaysMilliseconds = [15_000, 30_000] as const;
const defaultJitterMilliseconds = 1_000;

type ProductRequester = Pick<AliExpressClient, 'getProduct'>;
type TrackerRepository = Pick<
  AliExpressTrackerRepository,
  'findPublications' | 'findProductIdsWithHistory' | 'savePublicationCheck'
>;
type Delay = (milliseconds: number) => Promise<void>;
type Random = () => number;
type TrackerLogger = Pick<Console, 'error' | 'info' | 'warn'>;

export type AliExpressTrackerResult = {
  publications: {
    total: number;
    processed: number;
    failed: number;
  };
  refreshedPublicationProductIds?: string[];
  products: {
    tracked: number;
    initialSnapshots: number;
    changed: number;
    unchanged: number;
    missing: number;
  };
  aborted: boolean;
};

export type AliExpressTrackerDependencies = {
  repository?: TrackerRepository;
  aliexpressClient?: ProductRequester;
  delay?: Delay;
  delayMilliseconds?: number;
  userValidationRetryDelaysMilliseconds?: readonly number[];
  random?: Random;
  logger?: TrackerLogger;
};

const wait: Delay = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

function addJitter(milliseconds: number, random: Random): number {
  return (
    milliseconds +
    Math.floor(Math.max(0, Math.min(random(), 0.999_999)) * defaultJitterMilliseconds)
  );
}

function normalizePrice(price: number | null): string | null {
  return price === null ? null : price.toFixed(2);
}

function hasCurrentStateChanged(
  product: TrackedPublication['products'][number],
  observation: { price: string | null; currency: string | null; quantityAvailable: number | null },
): boolean {
  return (
    product.price !== observation.price ||
    product.currency !== observation.currency ||
    product.quantityAvailable !== observation.quantityAvailable
  );
}

function isGlobalAliExpressError(result: AliExpressProductResult): boolean {
  return result.body.errorCode === 'ALIEXPRESS_SESSION_REAUTH_REQUIRED';
}

function isUserValidationError(result: AliExpressProductResult): boolean {
  return (
    result.body.mtopRet?.some((entry) => entry.toUpperCase().includes('FAIL_SYS_USER_VALIDATE')) ??
    false
  );
}

async function getProductWithUserValidationRetries({
  client,
  productId,
  publicationId,
  delay,
  retryDelaysMilliseconds,
  random,
  logger,
}: {
  client: ProductRequester;
  productId: string;
  publicationId: string;
  delay: Delay;
  retryDelaysMilliseconds: readonly number[];
  random: Random;
  logger: TrackerLogger;
}): Promise<AliExpressProductResult> {
  let result = await client.getProduct(productId);

  for (const [index, retryDelayMilliseconds] of retryDelaysMilliseconds.entries()) {
    if (!isUserValidationError(result)) {
      break;
    }

    const retryDelayWithJitterMilliseconds = addJitter(retryDelayMilliseconds, random);
    logger.warn(
      JSON.stringify({
        event: 'aliexpress_tracker_user_validation_retry',
        publicationId,
        aliexpressProductId: productId,
        retryAttempt: index + 1,
        retryDelayMilliseconds: retryDelayWithJitterMilliseconds,
        mtopRet: result.body.mtopRet,
        upstreamStatus: result.body.upstreamStatus,
      }),
    );
    await delay(retryDelayWithJitterMilliseconds);
    result = await client.getProduct(productId);
  }

  return result;
}

function createEmptyResult(publications: number): AliExpressTrackerResult {
  return {
    publications: { total: publications, processed: 0, failed: 0 },
    products: { tracked: 0, initialSnapshots: 0, changed: 0, unchanged: 0, missing: 0 },
    refreshedPublicationProductIds: [],
    aborted: false,
  };
}

function logSummary(logger: TrackerLogger, result: AliExpressTrackerResult) {
  logger.info(
    JSON.stringify({
      event: 'aliexpress_tracker_finished',
      publications: result.publications,
      products: result.products,
      aborted: result.aborted,
    }),
  );
}

export async function trackAllAliExpressPublications({
  repository = new AliExpressTrackerRepository(),
  aliexpressClient: client = aliexpressClient,
  delay = wait,
  delayMilliseconds = defaultDelayMilliseconds,
  userValidationRetryDelaysMilliseconds = defaultUserValidationRetryDelaysMilliseconds,
  random = Math.random,
  logger = console,
}: AliExpressTrackerDependencies = {}): Promise<AliExpressTrackerResult> {
  const publications = await repository.findPublications();
  const result = createEmptyResult(publications.length);
  logger.info(
    JSON.stringify({ event: 'aliexpress_tracker_started', publications: publications.length }),
  );

  for (const [index, publication] of publications.entries()) {
    try {
      const upstreamResult = await getProductWithUserValidationRetries({
        client,
        productId: publication.aliexpressProductId,
        publicationId: publication.id,
        delay,
        retryDelaysMilliseconds: userValidationRetryDelaysMilliseconds,
        random,
        logger,
      });
      if (upstreamResult.status !== 200 || !upstreamResult.body.success) {
        result.publications.failed += 1;
        const userValidationError = isUserValidationError(upstreamResult);
        if (userValidationError) {
          logger.error(
            JSON.stringify({
              event: 'aliexpress_tracker_user_validation_blocked',
              publicationId: publication.id,
              aliexpressProductId: publication.aliexpressProductId,
              mtopRet: upstreamResult.body.mtopRet,
              upstreamStatus: upstreamResult.body.upstreamStatus,
            }),
          );
        }
        logger.error(
          JSON.stringify({
            event: 'aliexpress_tracker_publication_failed',
            publicationId: publication.id,
            aliexpressProductId: publication.aliexpressProductId,
            status: upstreamResult.status,
            errorCode: upstreamResult.body.errorCode,
            mtopRet: upstreamResult.body.mtopRet,
            upstreamStatus: upstreamResult.body.upstreamStatus,
          }),
        );

        if (isGlobalAliExpressError(upstreamResult)) {
          result.aborted = true;
          break;
        }
      } else {
        await trackPublication({ publication, upstreamResult, repository, result, logger });
        result.publications.processed += 1;
      }
    } catch (error) {
      result.publications.failed += 1;
      logger.error(
        JSON.stringify({
          event: 'aliexpress_tracker_publication_failed',
          publicationId: publication.id,
          aliexpressProductId: publication.aliexpressProductId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }

    if (!result.aborted && index < publications.length - 1) {
      await delay(addJitter(delayMilliseconds, random));
    }
  }

  logSummary(logger, result);
  return result;
}

async function trackPublication({
  publication,
  upstreamResult,
  repository,
  result,
  logger,
}: {
  publication: TrackedPublication;
  upstreamResult: AliExpressProductResult;
  repository: TrackerRepository;
  result: AliExpressTrackerResult;
  logger: TrackerLogger;
}): Promise<void> {
  const capturedAt = new Date();
  const upstreamProductsBySku = new Map(
    upstreamResult.body.products.map((product) => [product.aliexpressSkuId, product]),
  );
  const productIdsWithHistory = await repository.findProductIdsWithHistory(
    publication.products.map((product) => product.id),
  );
  const observations: PublicationObservation[] = [];

  for (const product of publication.products) {
    result.products.tracked += 1;
    const upstreamProduct = upstreamProductsBySku.get(product.aliexpressSkuId);
    if (!upstreamProduct) {
      result.products.missing += 1;
      logger.warn(
        JSON.stringify({
          event: 'aliexpress_tracker_sku_missing',
          publicationId: publication.id,
          aliexpressSkuId: product.aliexpressSkuId,
        }),
      );
      continue;
    }

    result.refreshedPublicationProductIds!.push(product.id);

    const state = {
      price: normalizePrice(upstreamProduct.priceAmount),
      currency: upstreamProduct.currency,
      quantityAvailable: upstreamProduct.quantityAvailable,
    };
    const hasHistory = productIdsWithHistory.has(product.id);
    const changed = hasCurrentStateChanged(product, state);

    if (!hasHistory) {
      result.products.initialSnapshots += 1;
      observations.push({
        publicationProductId: product.id,
        ...state,
        updateCurrentState: changed,
      });
      continue;
    }

    if (changed) {
      result.products.changed += 1;
      observations.push({
        publicationProductId: product.id,
        ...state,
        updateCurrentState: true,
      });
    } else {
      result.products.unchanged += 1;
    }
  }

  await repository.savePublicationCheck({
    publicationId: publication.id,
    capturedAt,
    observations,
  });
}
