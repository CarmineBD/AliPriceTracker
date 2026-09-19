import type { Coupon } from '@alitracker/shared';

import {
  CouponDiscountBadge,
  formatCouponAmount,
  formatCouponDiscount,
} from '@/components/coupon-discount-badge';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';

type OpportunityCouponFiltersProps = {
  coupons: Coupon[];
  selectedCoupons: Coupon[];
  disabled: boolean;
  onSelectedCouponsChange: (coupons: Coupon[]) => void;
};

function couponLabel(coupon: Coupon): string {
  return `${formatCouponDiscount(coupon.discountAmount)} desde ${formatCouponAmount(coupon.minPurchase)}`;
}

export function OpportunityCouponFilters({
  coupons,
  selectedCoupons,
  disabled,
  onSelectedCouponsChange,
}: OpportunityCouponFiltersProps) {
  return (
    <section className="mb-6 max-w-xl space-y-2" aria-labelledby="opportunity-coupon-filters-title">
      <div>
        <h2 id="opportunity-coupon-filters-title" className="text-sm font-medium">
          Filtrar cupones disponibles
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Los cupones del evento activo están seleccionados por defecto.
        </p>
      </div>
      <Combobox
        multiple
        items={coupons}
        value={selectedCoupons}
        onValueChange={onSelectedCouponsChange}
        itemToStringLabel={couponLabel}
        itemToStringValue={(coupon) => coupon.id}
        disabled={disabled}
      >
        <ComboboxChips>
          {selectedCoupons.map((coupon) => (
            <ComboboxChip key={coupon.id}>
              <CouponDiscountBadge amount={coupon.discountAmount} category={coupon.category} />
            </ComboboxChip>
          ))}
          <ComboboxChipsInput
            placeholder="Buscar cupones..."
            aria-label="Cupones disponibles para oportunidades"
            disabled={disabled}
          />
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxList>
            {(coupon: Coupon) => (
              <ComboboxItem key={coupon.id} value={coupon}>
                <CouponDiscountBadge amount={coupon.discountAmount} category={coupon.category} />
                <span>Desde {formatCouponAmount(coupon.minPurchase)}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty>No hay cupones disponibles.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </section>
  );
}
