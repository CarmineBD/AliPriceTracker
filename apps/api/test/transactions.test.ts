import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app';

const productId = '8d8c883c-7e36-4af0-a8b3-152b20c41f3c';
const offerId = '60ff824e-a554-4a34-93ee-ffbbd8d994f0';

describe('transaction input validation', () => {
  it('rejects invalid purchase statuses before accessing the database', async () => {
    const response = await request(app).post('/api/purchases').send({
      productId,
      offerId,
      totalFinalPrice: 12.5,
      status: 'paid',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  it('rejects sales with dates that are not timezone-aware ISO timestamps', async () => {
    const response = await request(app).post('/api/sales').send({
      productId,
      totalSalePrice: 12.5,
      status: 'sent',
      date: '2026-09-21',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  it('rejects invalid transaction pagination before accessing the database', async () => {
    const response = await request(app).get('/api/purchases?page=0');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });
});
