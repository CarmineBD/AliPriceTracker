import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { couponCreateSchema, couponUpdateSchema } from '@alitracker/shared';

import { app } from '../src/app';

describe('events request validation', () => {
  it('accepts only the allowed nullable categories', () => {
    expect(
      couponCreateSchema.parse({ minPurchase: 79, discountAmount: 10, category: 'special' }),
    ).toEqual({ minPurchase: 79, discountAmount: 10, category: 'special' });
    expect(couponUpdateSchema.parse({ category: '' })).toEqual({ category: null });
    expect(() =>
      couponCreateSchema.parse({ minPurchase: 79, discountAmount: 10, category: 'other' }),
    ).toThrow();
  });

  it('rejects invalid pagination and invalid event time ranges before using the database', async () => {
    expect((await request(app).get('/api/events/coupons?page=0')).status).toBe(400);
    expect(
      (
        await request(app).post('/api/events').send({
          name: 'Evento inválido',
          startsAt: '2026-11-12T00:00:00.000Z',
          endsAt: '2026-11-11T00:00:00.000Z',
          couponIds: [],
        })
      ).status,
    ).toBe(400);
  });
});
