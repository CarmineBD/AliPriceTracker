import { storesListResponseSchema, type Store } from '@alitracker/shared';

import { request } from './client';

export async function getStores(): Promise<Store[]> {
  return storesListResponseSchema.parse(await request<unknown>('/api/stores'));
}
