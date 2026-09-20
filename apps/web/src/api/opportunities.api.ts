import {
  bestCouponCombinationsListQuerySchema,
  bestCouponCombinationsListResponseSchema,
  opportunitiesListQuerySchema,
  opportunitiesListResponseSchema,
  type BestCouponCombinationsList,
  type BestCouponCombinationsListQuery,
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

export async function getBestCouponCombinations(
  query: BestCouponCombinationsListQuery,
): Promise<BestCouponCombinationsList> {
  const parsedQuery = bestCouponCombinationsListQuerySchema.parse(query);
  const search = new URLSearchParams();
  for (const couponId of parsedQuery.couponIds ?? []) {
    search.append('couponIds', couponId);
  }

  const queryString = search.toString();
  return bestCouponCombinationsListResponseSchema.parse(
    await request<unknown>(
      `/api/opportunities/best-by-coupon${queryString ? `?${queryString}` : ''}`,
    ),
  );
}
