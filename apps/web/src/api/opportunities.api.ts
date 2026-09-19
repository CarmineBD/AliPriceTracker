import {
  opportunitiesListQuerySchema,
  opportunitiesListResponseSchema,
  type OpportunitiesList,
  type OpportunitiesListQuery,
} from '@alitracker/shared';

import { request } from './client';

export async function getOpportunities(query: OpportunitiesListQuery): Promise<OpportunitiesList> {
  const parsedQuery = opportunitiesListQuerySchema.parse(query);
  const search = new URLSearchParams({
    sort: parsedQuery.sort,
    page: String(parsedQuery.page),
    pageSize: String(parsedQuery.pageSize),
  });
  for (const couponId of parsedQuery.couponIds ?? []) {
    search.append('couponIds', couponId);
  }

  return opportunitiesListResponseSchema.parse(
    await request<unknown>(`/api/opportunities?${search.toString()}`),
  );
}
