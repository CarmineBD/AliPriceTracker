import { metricsResponseSchema, type Metrics } from '@alitracker/shared';

import { request } from './client';

export async function getMetrics(): Promise<Metrics> {
  return metricsResponseSchema.parse(await request<unknown>('/api/metrics'));
}
