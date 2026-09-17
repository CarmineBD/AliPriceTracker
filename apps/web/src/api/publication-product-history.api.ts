import {
  publicationProductHistoryResponseSchema,
  type PublicationProductHistoryResponse,
} from '@alitracker/shared';

import { request } from './client';

export type PublicationProductHistoryFilters = {
  from?: string;
  to?: string;
};

export async function getPublicationProductHistory(
  publicationProductId: string,
  filters: PublicationProductHistoryFilters = {},
): Promise<PublicationProductHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (filters.from) searchParams.set('from', filters.from);
  if (filters.to) searchParams.set('to', filters.to);

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
  const response = await request<unknown>(
    `/api/publication-products/${publicationProductId}/history${query}`,
  );

  return publicationProductHistoryResponseSchema.parse(response);
}
