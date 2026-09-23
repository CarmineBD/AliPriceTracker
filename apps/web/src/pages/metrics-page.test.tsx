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
  it('shows benefit totals and ROI with at most two decimal places', async () => {
    mockedGetMetrics.mockResolvedValue({
      totalPurchases: 120.1,
      totalSales: 180.25,
      totalProfit: 60.15,
      roi: 50.08,
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
    expect(screen.getByText('(50,08 %ROI)')).toBeInTheDocument();
    expect(screen.getByText(/180,25\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/120,10\s*€/)).toBeInTheDocument();
  });
});
