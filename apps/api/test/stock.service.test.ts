import { describe, expect, it } from 'vitest';

import { listStock } from '../src/modules/stock/stock.service.js';

describe('listStock', () => {
  it('calculates stock and exposes labels for ordered purchases and sales to be sent', async () => {
    const result = await listStock({
      findAll: async () => [
        {
          productId: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
          imageKey: 'products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c/image.webp',
          name: 'Cámara de acción',
          shortName: 'Cámara',
          quantity: 2,
          orderedQuantity: 3,
          toBeSentQuantity: 1,
        },
      ],
    });

    expect(result).toEqual({
      stock: [
        {
          productId: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
          imageUrl:
            'https://media.example.test/products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c/image.webp',
          name: 'Cámara de acción',
          shortName: 'Cámara',
          quantity: 2,
          statusLabels: [
            {
              status: 'ordered',
              label: 'Pedido, pendiente de recibir',
              quantity: 3,
            },
            {
              status: 'to_be_sent',
              label: 'Pendiente de enviar',
              quantity: 1,
            },
          ],
        },
      ],
    });
  });

  it('excludes products without stock or pending operations', async () => {
    const result = await listStock({
      findAll: async () => [
        {
          productId: 'c67b917d-d8f8-4de6-9c47-fbaa82a705e5',
          imageKey: null,
          name: 'Sin movimientos',
          shortName: 'Sin movimientos',
          quantity: 0,
          orderedQuantity: 0,
          toBeSentQuantity: 0,
        },
      ],
    });

    expect(result).toEqual({
      stock: [],
    });
  });

  it('keeps zero-quantity products with pending operations', async () => {
    const result = await listStock({
      findAll: async () => [
        {
          productId: 'c67b917d-d8f8-4de6-9c47-fbaa82a705e5',
          imageKey: null,
          name: 'Pendiente de recibir',
          shortName: 'Pendiente',
          quantity: 0,
          orderedQuantity: 2,
          toBeSentQuantity: 0,
        },
      ],
    });

    expect(result).toEqual({
      stock: [
        {
          productId: 'c67b917d-d8f8-4de6-9c47-fbaa82a705e5',
          imageUrl: null,
          name: 'Pendiente de recibir',
          shortName: 'Pendiente',
          quantity: 0,
          statusLabels: [
            {
              status: 'ordered',
              label: 'Pedido, pendiente de recibir',
              quantity: 2,
            },
          ],
        },
      ],
    });
  });
});
