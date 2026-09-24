import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { OpportunitiesPage } from './opportunities-page';

const {
  getActiveEventsMock,
  getCouponOptionsMock,
  getOpportunitiesMock,
  getBestCouponCombinationsMock,
} = vi.hoisted(() => ({
  getActiveEventsMock: vi.fn(),
  getCouponOptionsMock: vi.fn(),
  getOpportunitiesMock: vi.fn(),
  getBestCouponCombinationsMock: vi.fn(),
}));

vi.mock('@/api/opportunities.api', () => ({
  getOpportunities: getOpportunitiesMock,
  getBestCouponCombinations: getBestCouponCombinationsMock,
}));
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
            category: 'event',
          },
        ],
      },
    ]);
    getCouponOptionsMock.mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000002',
        minPurchase: 279,
        discountAmount: 30,
        category: 'event',
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        minPurchase: 369,
        discountAmount: 45,
        category: 'event',
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
            category: 'event',
          },
          effectivePurchasePrice: 259,
          estimatedSellingPrice: 355,
          estimatedProfit: 96,
          roi: 37.07,
          nextCoupon: {
            id: '00000000-0000-4000-8000-000000000003',
            minPurchase: 369,
            discountAmount: 45,
            category: 'event',
          },
          amountToNextCoupon: 80,
          stock: 5,
          offerUrl: 'https://example.com/offer',
          offerObservedAt: '2026-09-18T10:00:00.000Z',
        },
      ],
      comboOpportunities: [],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getBestCouponCombinationsMock.mockResolvedValue({
      combinations: [
        {
          coupon: {
            id: '00000000-0000-4000-8000-000000000002',
            minPurchase: 279,
            discountAmount: 30,
            category: 'event',
          },
          isCombo: false,
          products: [
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
                category: 'event',
              },
              effectivePurchasePrice: 1259,
              estimatedSellingPrice: 2355,
              estimatedProfit: 1096,
              roi: 87.05,
              nextCoupon: null,
              amountToNextCoupon: null,
              stock: 5,
              offerUrl: 'https://example.com/offer',
              offerObservedAt: '2026-09-18T10:00:00.000Z',
            },
          ],
          basePurchasePrice: 1289,
          effectivePurchasePrice: 1259,
          estimatedSellingPrice: 2355,
          estimatedProfit: 1096,
          roi: 87.05,
        },
      ],
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
    expect(screen.getByRole('heading', { name: 'Por cuenta' })).toBeInTheDocument();
    expect(getOpportunitiesMock).not.toHaveBeenCalled();
    expect(await screen.findAllByText('DJI Neo 2')).toHaveLength(2);
    const couponCombobox = screen.getByRole('combobox', {
      name: 'Cupones disponibles para oportunidades',
    });
    expect(couponCombobox).toBeEnabled();
    expect(screen.getByRole('combobox', { name: 'Base del precio de venta' })).toHaveValue(
      'Precio medio hard codeado',
    );
    expect(screen.getByText('259,00 €')).toBeInTheDocument();
    expect(screen.getAllByText('-30€')).toHaveLength(3);
    expect(screen.getAllByText('37,07 %')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Ver cálculo del beneficio de DJI Neo 2' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'DJI Neo 2' })).toHaveLength(2);
    expect(screen.getByLabelText('Inversión estimada')).toHaveTextContent('1.259 €');
    expect(screen.getByLabelText('Beneficio total estimado')).toHaveTextContent('1.096 €');
    expect(screen.getByText('ROI 87,1%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Incluir DJI Neo 2 con este cupón' }));
    expect(screen.getByLabelText('Inversión estimada')).toHaveTextContent('0 €');
    expect(screen.getByLabelText('Beneficio total estimado')).toHaveTextContent('0 €');
    expect(screen.getByText('ROI —')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oportunidades' })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('columnheader')
        .slice(0, 7)
        .map((header) => header.textContent),
    ).toEqual(['Imagen', 'Nombre', 'Precio', 'Precio final', 'Cupón aplicado', 'Beneficio', 'ROI']);
    expect(
      screen
        .getAllByRole('columnheader')
        .slice(7)
        .map((header) => header.textContent),
    ).toEqual([
      'Incluir en el cálculo',
      'Cupón',
      'Imagen',
      'Nombre corto',
      'Precio final',
      'Beneficio',
    ]);
    await waitFor(() => {
      expect(getOpportunitiesMock).toHaveBeenLastCalledWith({
        sort: 'roi-desc',
        page: 1,
        pageSize: 20,
        couponIds: ['00000000-0000-4000-8000-000000000002'],
        sellingPriceSource: 'hard-coded',
        historicalPricePeriod: 'all',
      });
      expect(getBestCouponCombinationsMock).toHaveBeenLastCalledWith({
        couponIds: ['00000000-0000-4000-8000-000000000002'],
        sellingPriceSource: 'hard-coded',
        historicalPricePeriod: 'all',
      });
    });
    expect(getActiveEventsMock).toHaveBeenCalledOnce();
    expect(getCouponOptionsMock).toHaveBeenCalledOnce();
    expect(getOpportunitiesMock).toHaveBeenCalledOnce();
    expect(getBestCouponCombinationsMock).toHaveBeenCalledOnce();
  });
});
