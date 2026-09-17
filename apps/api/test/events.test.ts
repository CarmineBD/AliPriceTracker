import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app';

describe('events request validation', () => {
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
