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
};

export type HistoryChartInput = Pick<PublicationProductHistoryResponse, 'baseline' | 'history'> & {
  current: PublicationProductHistoryResponse['publicationProduct']['current'];
  from?: string;
  lastCheckedAt: string | null;
};

export type { PublicationProductHistoryEntry };
