import {
  aliExpressProductIdSchema,
  aliExpressProductLookupResponseSchema,
  type AliExpressProductLookup,
} from '@alitracker/shared';

import { request } from './client';

export async function getAliExpressProduct(productId: string): Promise<AliExpressProductLookup> {
  const id = aliExpressProductIdSchema.parse(productId);

  return aliExpressProductLookupResponseSchema.parse(
    await request<unknown>(`/api/aliexpress/products/${encodeURIComponent(id)}`),
  );
}
