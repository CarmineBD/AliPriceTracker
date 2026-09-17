import type {
  BestOfferHistoryChartInput,
  BestOfferHistoryChartPoint,
  BestOfferHistoryRange,
} from './product-best-offer-history.types';

function toPoint(entry: {
  capturedAt: string;
  price: string | null;
  currency: string | null;
  quantityAvailable: number | null;
  publicationUrl: string | null;
  isAvailable: boolean;
}): BestOfferHistoryChartPoint | null {
  const timestamp = new Date(entry.capturedAt).getTime();
  if (Number.isNaN(timestamp)) return null;
  const price = entry.price === null ? null : Number(entry.price);
  return {
    timestamp,
    capturedAt: entry.capturedAt,
    price: Number.isFinite(price) ? price : null,
    currency: entry.currency,
    quantityAvailable: entry.quantityAvailable,
    publicationUrl: entry.publicationUrl,
    isAvailable: entry.isAvailable,
  };
}

export function buildBestOfferHistoryChartData({
  baseline,
  history,
  from,
}: BestOfferHistoryChartInput): BestOfferHistoryChartPoint[] {
  const points: BestOfferHistoryChartPoint[] = [];
  if (baseline && from) {
    const point = toPoint({ ...baseline, capturedAt: from });
    if (point) points.push(point);
  }
  for (const entry of history) {
    const point = toPoint(entry);
    if (point) points.push(point);
  }
  return points.sort((left, right) => left.timestamp - right.timestamp);
}

export function getBestOfferRangeFrom(
  range: BestOfferHistoryRange,
  now = new Date(),
): string | undefined {
  const hours: Partial<Record<BestOfferHistoryRange, number>> = {
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
  };
  return hours[range] === undefined
    ? undefined
    : new Date(now.getTime() - hours[range] * 60 * 60 * 1000).toISOString();
}

export function formatBestOfferPrice(price: number | null, currency: string | null): string {
  if (price === null) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: currency ? 'currency' : 'decimal',
    currency: currency ?? undefined,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}
