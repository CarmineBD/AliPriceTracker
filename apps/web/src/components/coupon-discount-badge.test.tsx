import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CouponDiscountBadge } from './coupon-discount-badge';

describe('CouponDiscountBadge', () => {
  it('keeps the destructive background and adds a faint yellow overlay for special coupons', () => {
    render(<CouponDiscountBadge amount={10} category="special" />);

    expect(screen.getByLabelText(/cupón especial/i)).toHaveClass(
      'bg-destructive/10',
      'before:bg-linear-to-r',
      'before:to-yellow-200/25',
    );
  });

  it('keeps the existing appearance for regular coupons', () => {
    render(<CouponDiscountBadge amount={10} category="event" />);

    expect(screen.getByLabelText('Descuento de -10€')).not.toHaveClass('bg-linear-to-r');
  });
});
