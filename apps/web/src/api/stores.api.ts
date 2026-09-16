import {
  storeDetailResponseSchema,
  storesListResponseSchema,
  type Store,
  type StoreDetail,
} from '@alitracker/shared';

import { request } from './client';

export async function getStores(): Promise<Store[]> {
  return storesListResponseSchema.parse(await request<unknown>('/api/stores'));
}

export async function getStore(id: string): Promise<StoreDetail> {
  return storeDetailResponseSchema.parse(await request<unknown>(`/api/stores/${id}`));
}
