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
  it('shows one table with the average prices and calculated profit for every product', async () => {
    mockedGetAveragePrices.mockResolvedValue({
      sales: [
        {
          productId: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
          imageUrl: null,
          shortName: 'Camara',
          averagePrice: 18.125,
        },
        {
          productId: '36c4dd5c-e85e-4d49-aa72-c81a75142af3',
          imageUrl: null,
          shortName: 'Dado',
          averagePrice: 2.5,
        },
        {
          productId: '7efcc3d3-9172-4f0c-a57b-fcb16a3a9531',
          imageUrl: null,
          shortName: 'Gafas',
          averagePrice: 5,
        },
      ],
      purchases: [
        {
          productId: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
          imageUrl: null,
          shortName: 'Camara',
          averagePrice: 10,
        },
        {
          productId: 'c67b917d-d8f8-4de6-9c47-fbaa82a705e5',
          imageUrl: null,
          shortName: 'Cable',
          averagePrice: 3.5,
        },
        {
          productId: '7efcc3d3-9172-4f0c-a57b-fcb16a3a9531',
          imageUrl: null,
          shortName: 'Gafas',
          averagePrice: 10,
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
    expect(await screen.findByRole('link', { name: 'Camara' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver detalles de Camara' })).toHaveAttribute(
      'href',
      '/products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
    );
    expect(screen.getByText(/18,13\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/3,50\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/^8,13\s*€/)).toBeInTheDocument();
    expect(screen.getByText('(ROI 81 %)')).toBeInTheDocument();
    expect(screen.getByText(/-5,00\s*€/)).toHaveClass('text-destructive');
    expect(screen.getByText('(ROI -50,00 %)')).toHaveClass('text-muted-foreground');
    expect(screen.getAllByText('-')).toHaveLength(4);
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Imagen',
      'Nombre corto',
      'Precio medio de compra',
      'Precio medio de venta',
      'Beneficio',
    ]);
  });
});
