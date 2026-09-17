import { HttpError } from '../../utils/http-error.js';
import {
  ProductBestOfferRepository,
  type BestOfferState,
  type ProductBestOfferHistoryEntry,
  type ProductBestOfferHistoryFilters,
  type ProductOffer,
} from './product-best-offer.repository.js';

type RefreshRepository = Pick<ProductBestOfferRepository, 'findProductOffers' | 'saveIfChanged'>;
type HistoryRepository = Pick<
  ProductBestOfferRepository,
  'findProduct' | 'findHistory' | 'findBaseline' | 'findCurrent'
>;

const repository = new ProductBestOfferRepository();

export type ProductBestOfferRefreshResult = {
  productsEvaluated: number;
  initialSnapshots: number;
  changed: number;
  unchanged: number;
  unavailable: number;
  skippedIncompleteRefresh: number;
  skippedCurrencyMismatch: number;
};

function unavailableState(): BestOfferState {
  return {
    isAvailable: false,
    publicationProductId: null,
    price: null,
    currency: null,
    quantityAvailable: null,
    publicationUrl: null,
  };
}

function priceInCents(price: string): bigint {
  const [whole, fraction = ''] = price.split('.');
  return BigInt(whole ?? '0') * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function chooseBestOffer(offers: ProductOffer[]): BestOfferState | 'currency-mismatch' {
  const validOffers = offers.filter(
    (offer): offer is ProductOffer & { price: string; quantityAvailable: number } =>
      offer.price !== null && offer.quantityAvailable !== null && offer.quantityAvailable > 0,
  );
  if (validOffers.length === 0) return unavailableState();

  if (new Set(validOffers.map((offer) => offer.currency)).size > 1) return 'currency-mismatch';

  validOffers.sort((left, right) => {
    const priceDifference = priceInCents(left.price) - priceInCents(right.price);
    if (priceDifference !== 0n) return priceDifference < 0n ? -1 : 1;
    if (left.quantityAvailable !== right.quantityAvailable) {
      return right.quantityAvailable - left.quantityAvailable;
    }
    return left.publicationProductId.localeCompare(right.publicationProductId);
  });
  const winner = validOffers[0]!;
  return {
    isAvailable: true,
    publicationProductId: winner.publicationProductId,
    price: winner.price,
    currency: winner.currency,
    quantityAvailable: winner.quantityAvailable,
    publicationUrl: winner.publicationUrl,
  };
}

export async function refreshProductBestOffers(
  {
    refreshedPublicationProductIds,
    capturedAt,
  }: { refreshedPublicationProductIds: string[]; capturedAt: Date },
  refreshRepository: RefreshRepository = repository,
  logger: Pick<Console, 'warn'> = console,
): Promise<ProductBestOfferRefreshResult> {
  const result: ProductBestOfferRefreshResult = {
    productsEvaluated: 0,
    initialSnapshots: 0,
    changed: 0,
    unchanged: 0,
    unavailable: 0,
    skippedIncompleteRefresh: 0,
    skippedCurrencyMismatch: 0,
  };
  const refreshed = new Set(refreshedPublicationProductIds);
  const offersByProduct = await refreshRepository.findProductOffers();

  for (const [productId, offers] of offersByProduct) {
    if (!offers.every((offer) => refreshed.has(offer.publicationProductId))) {
      result.skippedIncompleteRefresh += 1;
      logger.warn(
        JSON.stringify({ event: 'product_best_offer_skipped_incomplete_refresh', productId }),
      );
      continue;
    }
    result.productsEvaluated += 1;
    const state = chooseBestOffer(offers);
    if (state === 'currency-mismatch') {
      result.skippedCurrencyMismatch += 1;
      logger.warn(
        JSON.stringify({ event: 'product_best_offer_skipped_currency_mismatch', productId }),
      );
      continue;
    }
    if (!state.isAvailable) result.unavailable += 1;
    const saved = await refreshRepository.saveIfChanged(productId, state, capturedAt);
    if (saved === 'initial') result.initialSnapshots += 1;
    if (saved === 'changed') result.changed += 1;
    if (saved === 'unchanged') result.unchanged += 1;
  }
  return result;
}

function toEntry(entry: ProductBestOfferHistoryEntry) {
  return {
    id: entry.id,
    isAvailable: entry.isAvailable,
    publicationProductId: entry.publicationProductId,
    price: entry.price,
    currency: entry.currency,
    quantityAvailable: entry.quantityAvailable,
    publicationUrl: entry.publicationUrl,
    capturedAt: entry.capturedAt.toISOString(),
  };
}

export async function getProductBestOfferHistory(
  productId: string,
  filters: ProductBestOfferHistoryFilters,
  historyRepository: HistoryRepository = repository,
) {
  if (filters.from && filters.to && filters.from > filters.to) {
    throw new HttpError('El parámetro from no puede ser posterior a to.', 400);
  }
  const product = await historyRepository.findProduct(productId);
  if (!product) throw new HttpError('Product not found.', 404);
  const [history, baseline, current] = await Promise.all([
    historyRepository.findHistory(productId, filters),
    filters.from ? historyRepository.findBaseline(productId, filters.from) : undefined,
    historyRepository.findCurrent(productId),
  ]);
  return {
    product,
    current: current ? toEntry(current) : null,
    baseline: baseline ? toEntry(baseline) : null,
    history: history.map(toEntry),
  };
}
