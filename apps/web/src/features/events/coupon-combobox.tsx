import type { Coupon } from '@alitracker/shared';

import {
  CouponDiscountBadge,
  formatCouponAmount,
  formatCouponDiscount,
} from '@/components/coupon-discount-badge';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';

type CouponComboboxProps = {
  coupons: Coupon[];
  disabled: boolean;
  onCouponIdChange: (couponId: string | undefined) => void;
};

function couponLabel(coupon: Coupon): string {
  return `${formatCouponDiscount(coupon.discountAmount)} desde ${formatCouponAmount(coupon.minPurchase)}`;
}

export function CouponCombobox({ coupons, disabled, onCouponIdChange }: CouponComboboxProps) {
  return (
    <Combobox
      items={coupons}
      value={null}
      onValueChange={(coupon) => onCouponIdChange(coupon?.id)}
      itemToStringLabel={couponLabel}
      itemToStringValue={(coupon) => coupon.id}
    >
      <ComboboxInput
        placeholder="Buscar y añadir cupón..."
        aria-label="Cupón disponible"
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxList>
          {(coupon: Coupon) => (
            <ComboboxItem key={coupon.id} value={coupon}>
              <CouponDiscountBadge amount={coupon.discountAmount} />
              <span>Desde {formatCouponAmount(coupon.minPurchase)}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>No se encontraron cupones.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
