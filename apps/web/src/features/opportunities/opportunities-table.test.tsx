import type { Opportunity } from '@alitracker/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { OpportunitiesTable } from './opportunities-table';

function createOpportunity(
  productId: string,
  shortName: string,
  effectivePurchasePrice: number,
): Opportunity {
  return {
    productId,
    imageUrl: null,
    name: shortName,
    shortName,
    basePurchasePrice: 120,
    currency: 'EUR',
    coupon: null,
    effectivePurchasePrice,
    estimatedSellingPrice: 150,
    estimatedProfit: 150 - effectivePurchasePrice,
    roi: null,
    nextCoupon: null,
    amountToNextCoupon: null,
    stock: null,
    offerUrl: null,
    offerObservedAt: '2026-10-10T10:00:00.000Z',
  };
}

describe('OpportunitiesTable', () => {
  it('shows average purchase prices and colors the final price relative to them', () => {
    render(
      <MemoryRouter>
        <OpportunitiesTable
          opportunities={[
            createOpportunity('00000000-0000-4000-8000-000000000001', 'Más caro', 110),
            createOpportunity('00000000-0000-4000-8000-000000000002', 'Más barato', 90),
          ]}
          averagePurchasePrices={[
            {
              productId: '00000000-0000-4000-8000-000000000001',
              imageUrl: null,
              shortName: 'Más caro',
              averagePrice: 100,
            },
            {
              productId: '00000000-0000-4000-8000-000000000002',
              imageUrl: null,
              shortName: 'Más barato',
              averagePrice: 100,
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('110,00 €')).toHaveClass('text-destructive');
    expect(screen.getByText('90,00 €')).toHaveClass('text-emerald-700');
    expect(screen.getAllByText('100,00 €')).toHaveLength(2);
  });
});
