import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { getStock } from '@/api/stock.api';
import { StockPage } from '@/pages/stock-page';

vi.mock('@/api/stock.api', () => ({
  getStock: vi.fn(),
}));

const mockedGetStock = vi.mocked(getStock);

describe('StockPage', () => {
  it('separates available, incoming, and pending-shipment stock', async () => {
    mockedGetStock.mockResolvedValue({
      stock: [
        {
          productId: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
          imageUrl: 'https://media.example.test/products/camera.webp',
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
        {
          productId: 'c67b917d-d8f8-4de6-9c47-fbaa82a705e5',
          imageUrl: null,
          name: 'Producto agotado',
          shortName: 'Agotado',
          quantity: 0,
          statusLabels: [],
        },
      ],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <StockPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Stock' })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Stock disponible' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'En camino' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Por enviar' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Stock disponible' })).toHaveTextContent('2');
    expect(screen.getByRole('table', { name: 'En camino' })).toHaveTextContent('3');
    expect(screen.getByRole('table', { name: 'Por enviar' })).toHaveTextContent('1');
    expect(screen.getAllByRole('link', { name: 'Cámara de acción' })[0]).toHaveAttribute(
      'href',
      '/products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
    );
    expect(screen.getAllByRole('img', { name: 'Imagen de Cámara de acción' })[0]).toHaveAttribute(
      'src',
      'https://media.example.test/products/camera.webp',
    );
  });
});
