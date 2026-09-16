import {
  AliExpressClient,
  aliexpressClient,
  type AliExpressProductResult,
} from '../aliexpress-client/aliexpress-client';
import {
  AliExpressTrackerRepository,
  type PublicationObservation,
  type TrackedPublication,
} from './aliexpress-tracker.repository';

const defaultDelayMilliseconds = 1_000;

type ProductRequester = Pick<AliExpressClient, 'getProduct'>;
type TrackerRepository = Pick<
  AliExpressTrackerRepository,
  'findPublications' | 'findProductIdsWithHistory' | 'savePublicationCheck'
>;
type Delay = (milliseconds: number) => Promise<void>;
type TrackerLogger = Pick<Console, 'error' | 'info' | 'warn'>;

export type AliExpressTrackerResult = {
  publications: {
    total: number;
    processed: number;
    failed: number;
  };
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
  logger?: TrackerLogger;
};

const wait: Delay = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

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

function createEmptyResult(publications: number): AliExpressTrackerResult {
  return {
    publications: { total: publications, processed: 0, failed: 0 },
    products: { tracked: 0, initialSnapshots: 0, changed: 0, unchanged: 0, missing: 0 },
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
  logger = console,
}: AliExpressTrackerDependencies = {}): Promise<AliExpressTrackerResult> {
  const publications = await repository.findPublications();
  const result = createEmptyResult(publications.length);
  logger.info(
    JSON.stringify({ event: 'aliexpress_tracker_started', publications: publications.length }),
  );

  for (const [index, publication] of publications.entries()) {
    try {
      const upstreamResult = await client.getProduct(publication.aliexpressProductId);
      if (upstreamResult.status !== 200 || !upstreamResult.body.success) {
        result.publications.failed += 1;
        logger.error(
          JSON.stringify({
            event: 'aliexpress_tracker_publication_failed',
            publicationId: publication.id,
            aliexpressProductId: publication.aliexpressProductId,
            status: upstreamResult.status,
            errorCode: upstreamResult.body.errorCode,
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
      await delay(delayMilliseconds);
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
