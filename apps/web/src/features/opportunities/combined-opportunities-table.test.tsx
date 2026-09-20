import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CombinedOpportunitiesTable } from './combined-opportunities-table';

describe('CombinedOpportunitiesTable', () => {
  it('shows the products and aggregate values of each coupon combo', () => {
    render(
      <CombinedOpportunitiesTable
        opportunities={[
          {
            coupon: {
              id: '00000000-0000-4000-8000-000000000001',
              minPurchase: 59,
              discountAmount: 5,
              category: 'event',
            },
            isCombo: true,
            products: [
              {
                productId: '00000000-0000-4000-8000-000000000002',
                imageUrl: 'https://media.example.test/products/a.png',
                name: 'Producto A',
                shortName: 'Producto A',
                basePurchasePrice: 30,
                currency: 'EUR',
                coupon: {
                  id: '00000000-0000-4000-8000-000000000001',
                  minPurchase: 59,
                  discountAmount: 5,
                  category: 'event',
                },
                effectivePurchasePrice: 27.5,
                estimatedSellingPrice: 60,
                estimatedProfit: 32.5,
                roi: 118.18,
                nextCoupon: null,
                amountToNextCoupon: null,
                stock: 2,
                offerUrl: 'https://example.com/product-a',
                offerObservedAt: '2026-09-20T10:00:00.000Z',
              },
              {
                productId: '00000000-0000-4000-8000-000000000003',
                imageUrl: null,
                name: 'Producto B',
                shortName: 'Producto B',
                basePurchasePrice: 30,
                currency: 'EUR',
                coupon: {
                  id: '00000000-0000-4000-8000-000000000001',
                  minPurchase: 59,
                  discountAmount: 5,
                  category: 'event',
                },
                effectivePurchasePrice: 27.5,
                estimatedSellingPrice: 60,
                estimatedProfit: 32.5,
                roi: 118.18,
                nextCoupon: null,
                amountToNextCoupon: null,
                stock: 2,
                offerUrl: null,
                offerObservedAt: '2026-09-20T10:00:00.000Z',
              },
            ],
            basePurchasePrice: 60,
            effectivePurchasePrice: 55,
            estimatedSellingPrice: 120,
            estimatedProfit: 65,
            roi: 118.18,
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Producto A' })).toHaveAttribute(
      'href',
      'https://example.com/product-a',
    );
    expect(screen.getByLabelText('Sin imagen para Producto B')).toBeInTheDocument();
    expect(screen.getByText('118,18 %')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Cupón',
      'Productos',
      'Precio final',
      'Beneficio',
      'ROI',
    ]);
  });
});
