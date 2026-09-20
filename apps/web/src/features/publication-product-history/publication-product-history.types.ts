import type {
  PublicationProductHistoryEntry,
  PublicationProductHistoryResponse,
} from '@alitracker/shared';

export type HistoryRange = '24h' | '7d' | '30d' | 'all';

export type HistoryChartPoint = {
  timestamp: number;
  capturedAt: string;
  price: number | null;
  currency: string | null;
  quantityAvailable: number | null;
  /** A visual continuation of the latest known state to the present time. */
  isProjectedToNow?: boolean;
};

export type HistoryChartInput = Pick<PublicationProductHistoryResponse, 'baseline' | 'history'> & {
  current: PublicationProductHistoryResponse['publicationProduct']['current'];
  from?: string;
  lastCheckedAt: string | null;
  now?: string;
};

export type { PublicationProductHistoryEntry };
