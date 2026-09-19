import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CouponFormDialog } from './coupon-form-dialog';

afterEach(cleanup);

describe('CouponFormDialog', () => {
  it('sends the selected category using the Spanish combobox label', () => {
    const onSubmit = vi.fn();

    render(
      <CouponFormDialog
        open
        coupon={{
          id: '00000000-0000-4000-8000-000000000001',
          minPurchase: 79,
          discountAmount: 10,
          category: 'special',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
        }}
        isSaving={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('combobox', { name: /categor/i })).toHaveValue('Especial');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onSubmit).toHaveBeenCalledWith({ minPurchase: 79, discountAmount: 10, category: 'special' });
  });

  it('sends null when no category is selected', () => {
    const onSubmit = vi.fn();

    render(
      <CouponFormDialog open isSaving={false} onOpenChange={vi.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByRole('spinbutton', { name: /compra/i }), {
      target: { value: '79' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /descuento/i }), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onSubmit).toHaveBeenCalledWith({ minPurchase: 79, discountAmount: 10, category: null });
  });

  it('loads an existing category when editing a coupon', () => {
    render(
      <CouponFormDialog
        open
        coupon={{
          id: '00000000-0000-4000-8000-000000000001',
          minPurchase: 79,
          discountAmount: 10,
          category: 'event',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
        }}
        isSaving={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox', { name: /categor/i })).toHaveValue('Evento');
  });
});
