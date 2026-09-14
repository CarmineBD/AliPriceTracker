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

  it('rejects uploads with an unsupported image content type before accessing the database', async () => {
    const response = await request(app)
      .put('/api/products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c/image')
      .set('Content-Type', 'text/plain')
      .send('not an image');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });
});
