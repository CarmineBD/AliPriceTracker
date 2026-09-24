import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { PurchasesPage } from './purchases-page';
import { SalesPage } from './sales-page';

const { getPurchasesMock, getSalesMock, getProductOptionsMock } = vi.hoisted(() => ({
  getPurchasesMock: vi.fn(),
  getSalesMock: vi.fn(),
  getProductOptionsMock: vi.fn(),
}));

vi.mock('@/api/transactions.api', () => ({
  getPurchases: getPurchasesMock,
  getSales: getSalesMock,
  createPurchase: vi.fn(),
  updatePurchase: vi.fn(),
  deletePurchase: vi.fn(),
  createSale: vi.fn(),
  updateSale: vi.fn(),
  deleteSale: vi.fn(),
}));

vi.mock('@/api/products.api', () => ({
  getProductOptions: getProductOptionsMock,
  getProduct: vi.fn(),
}));

function renderPage(page: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('transaction pages', () => {
  afterEach(cleanup);

  it('shows the paginated purchase history and opens a form with the ordered status by default', async () => {
    getPurchasesMock.mockResolvedValue({
      purchases: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          productId: '00000000-0000-4000-8000-000000000002',
          offerId: '00000000-0000-4000-8000-000000000003',
          imageUrl: null,
          shortName: 'Auriculares',
          publicationUrl: 'https://www.aliexpress.com/item/1.html',
          totalFinalPrice: 12.5,
          status: 'ordered',
          date: '2026-09-21T12:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getProductOptionsMock.mockResolvedValue([]);

    renderPage(<PurchasesPage />);

    expect(await screen.findByText('Auriculares')).toBeInTheDocument();
    expect(screen.getByText('Ver publicación')).toHaveAttribute(
      'href',
      'https://www.aliexpress.com/item/1.html',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Añadir registro' }));

    expect(screen.getByRole('heading', { name: 'Añadir registro' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Seleccionar producto' })).toHaveFocus();
    expect(screen.getByRole('combobox', { name: 'Seleccionar estado' })).toHaveValue('Pedido');
  });

  it('shows sales without a publication column and defaults to to_be_sent', async () => {
    getSalesMock.mockResolvedValue({
      sales: [
        {
          id: '00000000-0000-4000-8000-000000000004',
          productId: '00000000-0000-4000-8000-000000000005',
          imageUrl: null,
          shortName: 'Teclado',
          totalSalePrice: 25,
          shippingCost: 3,
          profit: 12,
          profitBreakdown: {
            revenue: 25,
            shippingCost: 3,
            netRevenue: 22,
            cost: 10,
            allocations: [],
          },
          status: 'to_be_sent',
          date: '2026-09-21T12:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getProductOptionsMock.mockResolvedValue([]);

    renderPage(<SalesPage />);

    expect(await screen.findByText('Teclado')).toBeInTheDocument();
    expect(screen.getByText('Envío asumido')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /22,00/ })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /12,00/ })).toBeInTheDocument();
    expect(screen.queryByText('Ver publicación')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir registro' }));

    expect(screen.getByRole('combobox', { name: 'Seleccionar producto' })).toHaveFocus();
    expect(screen.getByRole('combobox', { name: 'Seleccionar estado' })).toHaveValue('Por enviar');
    expect(screen.getByLabelText('Coste de envío asumido')).toHaveValue(0);
  });
});
