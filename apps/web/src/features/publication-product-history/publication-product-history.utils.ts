import type {
  HistoryChartInput,
  HistoryChartPoint,
  HistoryRange,
} from './publication-product-history.types';

function toChartPoint(
  capturedAt: string,
  values: {
    price: string | null;
    currency: string | null;
    quantityAvailable: number | null;
  },
): HistoryChartPoint | null {
  const timestamp = new Date(capturedAt).getTime();
  if (Number.isNaN(timestamp)) return null;

  const price = values.price === null ? null : Number(values.price);
  return {
    timestamp,
    capturedAt,
    price: price !== null && Number.isFinite(price) ? price : null,
    currency: values.currency,
    quantityAvailable: values.quantityAvailable,
  };
}

/**
 * Creates visual-only boundary points because stored history contains changes, not periodic snapshots.
 */
export function buildHistoryChartData({
  baseline,
  history,
  current,
  from,
  lastCheckedAt,
}: HistoryChartInput): HistoryChartPoint[] {
  const points: HistoryChartPoint[] = [];

  if (baseline && from) {
    const baselinePoint = toChartPoint(from, baseline);
    if (baselinePoint) points.push(baselinePoint);
  }

  for (const entry of history) {
    const point = toChartPoint(entry.capturedAt, entry);
    if (point) points.push(point);
  }

  points.sort((left, right) => left.timestamp - right.timestamp);

  if (points.length === 0 || !lastCheckedAt) return points;

  const finalPoint = toChartPoint(lastCheckedAt, current);
  const lastPoint = points.at(-1);
  if (finalPoint && lastPoint && finalPoint.timestamp > lastPoint.timestamp) {
    points.push(finalPoint);
  }

  return points;
}

export function getRangeFrom(range: HistoryRange, now = new Date()): string | undefined {
  const millisecondsByRange: Partial<Record<HistoryRange, number>> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  const milliseconds = millisecondsByRange[range];

  return milliseconds === undefined
    ? undefined
    : new Date(now.getTime() - milliseconds).toISOString();
}

export function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return '—';

  const formatterOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };
  if (currency) {
    formatterOptions.style = 'currency';
    formatterOptions.currency = currency;
  }

  return new Intl.NumberFormat('es-ES', formatterOptions).format(price);
}
