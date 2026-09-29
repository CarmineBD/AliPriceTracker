import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionHistoryTable } from './transaction-history-table';

const purchases = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    productId: '00000000-0000-4000-8000-000000000002',
    offerId: null,
    imageUrl: null,
    shortName: 'Auriculares',
    publicationUrl: null,
    totalFinalPrice: 12.5,
    status: 'ordered' as const,
    date: '2026-09-21T12:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    productId: '00000000-0000-4000-8000-000000000004',
    offerId: null,
    imageUrl: null,
    shortName: 'Ratón',
    publicationUrl: null,
    totalFinalPrice: 8.5,
    status: 'ordered' as const,
    date: '2026-09-21T12:00:00.000Z',
  },
];

describe('TransactionHistoryTable', () => {
  it('shows a loading skeleton for every status update in progress', () => {
    render(
      <TransactionHistoryTable
        kind="purchase"
        transactions={purchases}
        updatingStatusTransactionIds={new Set(purchases.map((purchase) => purchase.id))}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('status', { name: 'Actualizando estado' })).toHaveLength(2);
  });
});
