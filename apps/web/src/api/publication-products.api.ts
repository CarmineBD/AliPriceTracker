import {
  publicationProductReassignSchema,
  type PublicationProductReassignInput,
} from '@alitracker/shared';

import { request } from './client';

export async function reassignPublicationProduct(
  publicationProductId: string,
  input: PublicationProductReassignInput,
): Promise<void> {
  const body = publicationProductReassignSchema.parse(input);
  await request(`/api/publication-products/${publicationProductId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deletePublicationProduct(publicationProductId: string): Promise<void> {
  await request(`/api/publication-products/${publicationProductId}`, { method: 'DELETE' });
}
