import { MetricsRepository } from './metrics.repository.js';

const repository = new MetricsRepository();

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(amount: number): number {
  return amount / 100;
}

export async function getMetrics(
  metricsRepository: Pick<MetricsRepository, 'getTotals'> = repository,
) {
  const totals = await metricsRepository.getTotals();
  const totalPurchases = fromCents(toCents(Number(totals.totalPurchases)));
  const totalSales = fromCents(toCents(Number(totals.totalSales)));
  const totalProfit = fromCents(toCents(totalSales) - toCents(totalPurchases));
  const roi =
    totalPurchases === 0 ? null : Math.round((totalProfit / totalPurchases) * 10_000) / 100;

  return { totalPurchases, totalSales, totalProfit, roi };
}
