import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { getMetrics } from '@/api/metrics.api';
import { MetricsPage } from '@/pages/metrics-page';

vi.mock('@/api/metrics.api', () => ({
  getMetrics: vi.fn(),
}));

const mockedGetMetrics = vi.mocked(getMetrics);

describe('MetricsPage', () => {
  it('shows FIFO metrics and the separate cash flow', async () => {
    mockedGetMetrics.mockResolvedValue({
      totalPurchases: 120.1,
      totalSales: 180.25,
      netCashFlow: 60.15,
      realizedProfit: 45.25,
      stockValue: 74.5,
      potentialStockProfit: 25.5,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <MetricsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Métricas' })).toBeInTheDocument();
    expect(await screen.findByText(/60,15\s*€/)).toBeInTheDocument();
    expect(screen.getByText('Beneficio realizado')).toBeInTheDocument();
    expect(screen.getByText('Valor del stock')).toBeInTheDocument();
    expect(screen.getByText('Beneficio potencial del stock')).toBeInTheDocument();
    expect(screen.getByText('Flujo neto de caja')).toBeInTheDocument();
    expect(screen.getByText(/45,25/)).toBeInTheDocument();
    expect(screen.getByText(/74,50/)).toBeInTheDocument();
    expect(screen.getByText(/25,50/)).toBeInTheDocument();
    expect(screen.getByText(/180,25\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/120,10\s*€/)).toBeInTheDocument();
  });
});
