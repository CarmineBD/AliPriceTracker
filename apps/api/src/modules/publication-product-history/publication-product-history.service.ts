import { HttpError } from '../../utils/http-error';
import {
  PublicationProductHistoryRepository,
  type PublicationProductHistoryEntry,
  type PublicationProductHistoryFilters,
} from './publication-product-history.repository';

type HistoryRepository = Pick<
  PublicationProductHistoryRepository,
  'findPublicationProduct' | 'findHistory' | 'findBaseline'
>;

const repository = new PublicationProductHistoryRepository();

function toHistoryEntry(entry: PublicationProductHistoryEntry) {
  return {
    id: entry.id,
    price: entry.price,
    currency: entry.currency,
    quantityAvailable: entry.quantityAvailable,
    capturedAt: entry.capturedAt.toISOString(),
  };
}

export async function getPublicationProductHistory(
  publicationProductId: string,
  filters: PublicationProductHistoryFilters,
  historyRepository: HistoryRepository = repository,
) {
  if (filters.from && filters.to && filters.from > filters.to) {
    throw new HttpError('El parámetro from no puede ser posterior a to.', 400);
  }

  const publicationProduct = await historyRepository.findPublicationProduct(publicationProductId);
  if (!publicationProduct) {
    throw new HttpError('Publication product not found.', 404);
  }

  const [history, baseline] = await Promise.all([
    historyRepository.findHistory(publicationProductId, filters),
    filters.from ? historyRepository.findBaseline(publicationProductId, filters.from) : undefined,
  ]);

  return {
    publicationProduct: {
      id: publicationProduct.id,
      publicationId: publicationProduct.publicationId,
      productId: publicationProduct.productId,
      aliexpressSkuId: publicationProduct.aliexpressSkuId,
      current: {
        price: publicationProduct.price,
        currency: publicationProduct.currency,
        quantityAvailable: publicationProduct.quantityAvailable,
      },
      lastCheckedAt: publicationProduct.lastCheckedAt?.toISOString() ?? null,
    },
    baseline: baseline ? toHistoryEntry(baseline) : null,
    history: history.map(toHistoryEntry),
  };
}
