import { Ticket } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

const discountFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
});

const amountFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

export function formatCouponDiscount(amount: number): string {
  return `-${discountFormatter.format(amount)}€`;
}

export function formatCouponAmount(amount: number): string {
  return amountFormatter.format(amount);
}

export function CouponDiscountBadge({ amount }: { amount: number }) {
  const discount = formatCouponDiscount(amount);

  return (
    <Badge variant="destructive" aria-label={`Descuento de ${discount}`}>
      <Ticket aria-hidden="true" />
      {discount}
    </Badge>
  );
}
