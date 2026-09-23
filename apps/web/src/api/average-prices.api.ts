import { averagePricesResponseSchema, type AveragePrices } from '@alitracker/shared';

import { request } from './client';

export async function getAveragePrices(): Promise<AveragePrices> {
  return averagePricesResponseSchema.parse(await request<unknown>('/api/average-prices'));
}
