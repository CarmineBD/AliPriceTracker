import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app';

describe('product input validation', () => {
  it('rejects a product without a name before accessing the database', async () => {
    const response = await request(app).post('/api/products').send({ shortName: 'Test' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  it('rejects malformed product identifiers', async () => {
    const response = await request(app).get('/api/products/not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });
});
