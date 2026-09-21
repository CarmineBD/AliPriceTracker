import { stockListResponseSchema, type StockList } from '@alitracker/shared';

import { request } from './client';

export async function getStock(): Promise<StockList> {
  return stockListResponseSchema.parse(await request<unknown>('/api/stock'));
}
