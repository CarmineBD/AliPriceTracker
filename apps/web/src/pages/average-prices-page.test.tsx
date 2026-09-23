import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { getAveragePrices } from '@/api/average-prices.api';
import { AveragePricesPage } from '@/pages/average-prices-page';

vi.mock('@/api/average-prices.api', () => ({
  getAveragePrices: vi.fn(),
}));

const mockedGetAveragePrices = vi.mocked(getAveragePrices);

describe('AveragePricesPage', () => {
  it('shows separate average sale and purchase price tables', async () => {
    mockedGetAveragePrices.mockResolvedValue({
      sales: [
        {
          productId: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
          imageUrl: null,
          shortName: 'Cámara',
          averagePrice: 18.125,
        },
      ],
      purchases: [
        {
          productId: 'c67b917d-d8f8-4de6-9c47-fbaa82a705e5',
          imageUrl: null,
          shortName: 'Cable',
          averagePrice: 3.5,
        },
      ],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AveragePricesPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Precios medios' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Precios medios de venta' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Precios medios de compra' })).toBeVisible();
    expect(screen.getByText(/18,13\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/3,50\s*€/)).toBeInTheDocument();
  });
});
