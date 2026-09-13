import { z } from 'zod';

import { request } from './client';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export async function getHealth(): Promise<HealthResponse> {
  const response = await request<unknown>('/api/health');
  return healthResponseSchema.parse(response);
}
