import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { OpportunitiesPage } from './opportunities-page';

const { getActiveEventsMock, getCouponOptionsMock, getOpportunitiesMock } = vi.hoisted(() => ({
  getActiveEventsMock: vi.fn(),
  getCouponOptionsMock: vi.fn(),
  getOpportunitiesMock: vi.fn(),
}));

vi.mock('@/api/opportunities.api', () => ({ getOpportunities: getOpportunitiesMock }));
vi.mock('@/api/events.api', () => ({
  getActiveEvents: getActiveEventsMock,
  getCouponOptions: getCouponOptionsMock,
}));

describe('OpportunitiesPage', () => {
  it('shows the ROI-ordered opportunity listing from the paginated API', async () => {
    getActiveEventsMock.mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000010',
        name: 'Sale',
        startsAt: '2026-09-18T00:00:00.000Z',
        endsAt: '2026-09-19T00:00:00.000Z',
        coupons: [
          {
            id: '00000000-0000-4000-8000-000000000002',
            minPurchase: 279,
            discountAmount: 30,
          },
        ],
      },
    ]);
    getCouponOptionsMock.mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000002',
        minPurchase: 279,
        discountAmount: 30,
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        minPurchase: 369,
        discountAmount: 45,
      },
    ]);
    getOpportunitiesMock.mockResolvedValue({
      opportunities: [
        {
          productId: '00000000-0000-4000-8000-000000000001',
          imageUrl: 'https://media.example.test/products/example.png',
          name: 'DJI Neo 2 Fly More Combo',
          shortName: 'DJI Neo 2',
          basePurchasePrice: 289,
          currency: 'EUR',
          coupon: {
            id: '00000000-0000-4000-8000-000000000002',
            minPurchase: 279,
            discountAmount: 30,
          },
          effectivePurchasePrice: 259,
          estimatedSellingPrice: 355,
          estimatedProfit: 96,
          roi: 37.07,
          nextCoupon: {
            id: '00000000-0000-4000-8000-000000000003',
            minPurchase: 369,
            discountAmount: 45,
          },
          amountToNextCoupon: 80,
          stock: 5,
          offerUrl: 'https://example.com/offer',
          offerObservedAt: '2026-09-18T10:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <OpportunitiesPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Oportunidades' })).toBeInTheDocument();
    expect(getOpportunitiesMock).not.toHaveBeenCalled();
    expect(await screen.findByText('DJI Neo 2')).toBeInTheDocument();
    const couponCombobox = screen.getByRole('combobox', {
      name: 'Cupones disponibles para oportunidades',
    });
    expect(couponCombobox).toBeEnabled();
    expect(screen.getByText('259,00 €')).toBeInTheDocument();
    expect(screen.getAllByText('-30€')).toHaveLength(2);
    expect(screen.getByText('37,07 %')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ver cálculo del beneficio de DJI Neo 2' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'DJI Neo 2' })).toHaveAttribute(
      'href',
      'https://example.com/offer',
    );
    expect(screen.getByRole('link', { name: 'Oportunidades' })).toHaveAttribute(
      'href',
      '/opportunities',
    );
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Imagen',
      'Nombre',
      'Precio final',
      'Cupón aplicado',
      'Beneficio',
      'ROI',
    ]);
    await waitFor(() => {
      expect(getOpportunitiesMock).toHaveBeenLastCalledWith({
        sort: 'roi-desc',
        page: 1,
        pageSize: 20,
        couponIds: ['00000000-0000-4000-8000-000000000002'],
      });
    });
    expect(getActiveEventsMock).toHaveBeenCalledOnce();
    expect(getCouponOptionsMock).toHaveBeenCalledOnce();
    expect(getOpportunitiesMock).toHaveBeenCalledOnce();
  });
});
