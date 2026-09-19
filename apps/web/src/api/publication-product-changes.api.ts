import {
  publicationProductChangesListQuerySchema,
  publicationProductChangesListResponseSchema,
  type PublicationProductChangesList,
  type PublicationProductChangesListQuery,
} from '@alitracker/shared';

import { request } from './client';

export async function getPublicationProductChanges(
  query: PublicationProductChangesListQuery,
): Promise<PublicationProductChangesList> {
  const parsedQuery = publicationProductChangesListQuerySchema.parse(query);
  const search = new URLSearchParams({
    page: String(parsedQuery.page),
    pageSize: String(parsedQuery.pageSize),
  });

  return publicationProductChangesListResponseSchema.parse(
    await request<unknown>(`/api/publication-product-changes?${search.toString()}`),
  );
}
