import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { getMetrics, getProfitHistory } from '@/api/metrics.api';
import { MetricsPage } from '@/pages/metrics-page';

vi.mock('@/api/metrics.api', () => ({
  getMetrics: vi.fn(),
  getProfitHistory: vi.fn(),
}));

const mockedGetMetrics = vi.mocked(getMetrics);
const mockedGetProfitHistory = vi.mocked(getProfitHistory);

describe('MetricsPage', () => {
  it('shows FIFO metrics and the separate cash flow', async () => {
    mockedGetMetrics.mockResolvedValue({
      totalPurchases: 120.1,
      totalSales: 180.25,
      netCashFlow: 60.15,
      realizedProfit: 45.25,
      pendingSalesCount: 0,
      realizedRoi: 56.7,
      stockCostValue: 74.5,
      estimatedStockSaleValue: 100,
      potentialStockProfit: 25.5,
    });
    mockedGetProfitHistory.mockResolvedValue({
      period: 'month',
      points: [
        {
          date: '2026-01-01T00:00:00.000Z',
          profit: 45.25,
          cumulativeProfit: 45.25,
          salesCount: 1,
          revenue: 120,
          cogs: 74.75,
        },
      ],
      summary: {
        profit: 45.25,
        roi: 60.5,
        salesCount: 1,
        revenue: 120,
        cogs: 74.75,
        averageProfitPerSale: 45.25,
        averageProfitPerPeriodWithSales: 45.25,
      },
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
    expect(screen.getByText('Gross Profit')).toBeInTheDocument();
    expect(screen.getByText('Valor de compra')).toBeInTheDocument();
    expect(screen.getByText('Valor estimado de venta')).toBeInTheDocument();
    expect(screen.getByText('Beneficio potencial del stock')).toBeInTheDocument();
    expect(screen.getByText(/Flujo neto de caja/)).toBeInTheDocument();
    expect(screen.getByText(/45,25/)).toBeInTheDocument();
    expect(screen.getByText('(56,7% ROI)')).toBeInTheDocument();
    expect(screen.getByText(/74,50/)).toBeInTheDocument();
    expect(screen.getByText(/100,00/)).toBeInTheDocument();
    expect(screen.getByText(/25,50/)).toBeInTheDocument();
    expect(screen.getByText(/180,25\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/120,10\s*€/)).toBeInTheDocument();
    expect(await screen.findByText('Grafico de beneficios')).toBeInTheDocument();
    expect(screen.getByLabelText('Gráfica de evolución de beneficios')).toBeInTheDocument();
    expect(screen.getByText('(60,5% ROI)')).toBeInTheDocument();
    expect(screen.queryByText('Profit medio por día con ventas')).not.toBeInTheDocument();
    expect(screen.queryByText('Profit medio por venta')).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Mes de evolución de beneficios' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mes actual' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Último año' })).toBeInTheDocument();
  });
});
