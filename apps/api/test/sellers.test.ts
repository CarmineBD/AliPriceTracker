import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app';

describe('seller input validation', () => {
  it('rejects a seller with a negative review score before accessing the database', async () => {
    const response = await request(app).post('/api/sellers').send({ reviewScore: -1 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  it('rejects a seller product without its required product reference before accessing the database', async () => {
    const response = await request(app).post('/api/seller-products').send({
      sellerId: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
      quantityAvailable: 1,
      maxPurchase: 1,
      url: 'https://www.aliexpress.com/item/123.html',
      aliexpressItemId: '123',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  it('rejects malformed seller-product filter identifiers before accessing the database', async () => {
    const response = await request(app).get('/api/seller-products?productId=not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });
});
