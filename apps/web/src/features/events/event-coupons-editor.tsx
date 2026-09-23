import type { Coupon } from '@alitracker/shared';
import { Ticket, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import {
  CouponDiscountBadge,
  formatCouponAmount,
  formatCouponDiscount,
} from '@/components/coupon-discount-badge';
import { FieldLabel } from '@/components/ui/field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CouponCombobox } from './coupon-combobox';

type EventCouponsEditorProps = {
  coupons: Coupon[];
  options: Coupon[];
  optionsLoading: boolean;
  disabled: boolean;
  onChange: (coupons: Coupon[]) => void;
};

export function EventCouponsEditor({
  coupons,
  options,
  optionsLoading,
  disabled,
  onChange,
}: EventCouponsEditorProps) {
  const availableCoupons = options.filter(
    (option) => !coupons.some((coupon) => coupon.id === option.id),
  );

  const addCoupon = (couponId: string | undefined) => {
    if (!couponId) return;
    const coupon = options.find((option) => option.id === couponId);
    if (coupon) onChange([...coupons, coupon]);
  };

  return (
    <section className="space-y-3" aria-labelledby="event-coupons-title">
      <div>
        <FieldLabel id="event-coupons-title">Cupones disponibles</FieldLabel>
        <p className="mt-1 text-sm text-muted-foreground">
          Añade los cupones que se podrán utilizar durante este evento.
        </p>
      </div>
      <CouponCombobox
        coupons={availableCoupons}
        disabled={disabled || optionsLoading}
        onCouponIdChange={addCoupon}
      />
      {coupons.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Este evento no tiene cupones asociados"
          description="Selecciona un cupón para poder utilizarlo durante el evento."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">Mínimo de compra</TableHead>
              <TableHead className="text-right">Descuento</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell className="text-right">
                  {formatCouponAmount(coupon.minPurchase)}
                </TableCell>
                <TableCell className="text-right">
                  <CouponDiscountBadge amount={coupon.discountAmount} category={coupon.category} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    aria-label={`Eliminar cupón de ${formatCouponDiscount(coupon.discountAmount)} del evento`}
                    onClick={() => onChange(coupons.filter((current) => current.id !== coupon.id))}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
