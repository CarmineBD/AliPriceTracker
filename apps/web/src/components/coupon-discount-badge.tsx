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

export function CouponDiscountBadge({
  amount,
  category,
}: {
  amount: number;
  category?: 'event' | 'special' | null;
}) {
  const discount = formatCouponDiscount(amount);

  return (
    <Badge
      variant="destructive"
      className={
        category === 'special'
          ? "relative bg-destructive/10 before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-r before:from-transparent before:to-yellow-200/25 before:content-[''] dark:bg-destructive/20 dark:before:to-yellow-300/15"
          : undefined
      }
      aria-label={`Descuento de ${discount}${category === 'special' ? ', cupón especial' : ''}`}
    >
      <Ticket aria-hidden="true" />
      {discount}
    </Badge>
  );
}
