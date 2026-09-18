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

  return opportunitiesListResponseSchema.parse(
    await request<unknown>(`/api/opportunities?${search.toString()}`),
  );
}
