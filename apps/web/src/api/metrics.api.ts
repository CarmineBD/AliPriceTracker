import {
  metricsResponseSchema,
  profitHistoryResponseSchema,
  type Metrics,
  type ProfitHistory,
  type ProfitHistoryPeriod,
} from '@alitracker/shared';

import { request } from './client';

export async function getMetrics(): Promise<Metrics> {
  return metricsResponseSchema.parse(await request<unknown>('/api/metrics'));
}

export async function getProfitHistory(
  period: ProfitHistoryPeriod,
  month?: string,
): Promise<ProfitHistory> {
  const searchParams = new URLSearchParams({ period });
  if (month) searchParams.set('month', month);

  return profitHistoryResponseSchema.parse(
    await request<unknown>(`/api/metrics/profit-history?${searchParams}`),
  );
}
