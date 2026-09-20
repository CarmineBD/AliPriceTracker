import type {
  ProductBestOfferHistoryEntry,
  ProductBestOfferHistoryResponse,
} from '@alitracker/shared';

export type BestOfferHistoryRange = '24h' | '7d' | '30d' | 'all';
export type BestOfferHistoryChartPoint = {
  timestamp: number;
  capturedAt: string;
  price: number | null;
  currency: string | null;
  quantityAvailable: number | null;
  publicationUrl: string | null;
  isAvailable: boolean;
  /** A visual continuation of the latest known offer to the present time. */
  isProjectedToNow?: boolean;
};
export type BestOfferHistoryChartInput = Pick<
  ProductBestOfferHistoryResponse,
  'baseline' | 'history'
> & {
  current: ProductBestOfferHistoryResponse['current'];
  from?: string;
  now?: string;
};
export type { ProductBestOfferHistoryEntry };
