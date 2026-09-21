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
  it('shows stock data and pending-operation labels in a table', async () => {
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
    expect(await screen.findByRole('cell', { name: '2' })).toBeInTheDocument();
    expect(screen.getByText('Pedido, pendiente de recibir (3)')).toBeInTheDocument();
    expect(screen.getByText('Pendiente de enviar (1)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cámara de acción' })).toHaveAttribute(
      'href',
      '/products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
    );
    expect(screen.getByRole('img', { name: 'Imagen de Cámara de acción' })).toHaveAttribute(
      'src',
      'https://media.example.test/products/camera.webp',
    );
    expect(screen.queryByText('Producto agotado')).not.toBeInTheDocument();
  });
});
