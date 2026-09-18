import { Ticket } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

const discountFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
});

export function formatCouponDiscount(amount: number): string {
  return `-${discountFormatter.format(amount)}€`;
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
