import {
  productBestOfferHistoryResponseSchema,
  type ProductBestOfferHistoryResponse,
} from '@alitracker/shared';

import { request } from './client';

export type ProductBestOfferHistoryFilters = { from?: string; to?: string };

export async function getProductBestOfferHistory(
  productId: string,
  filters: ProductBestOfferHistoryFilters = {},
): Promise<ProductBestOfferHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (filters.from) searchParams.set('from', filters.from);
  if (filters.to) searchParams.set('to', filters.to);
  const query = searchParams.size ? `?${searchParams.toString()}` : '';
  return productBestOfferHistoryResponseSchema.parse(
    await request<unknown>(`/api/products/${productId}/best-offer-history${query}`),
  );
}
