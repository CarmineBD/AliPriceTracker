import type { CouponResponse } from '@alitracker/shared';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  CouponDiscountBadge,
  formatCouponDiscount,
} from '@/components/coupon-discount-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type CouponTableProps = {
  coupons: CouponResponse[];
  onEdit: (coupon: CouponResponse) => void;
  onDelete: (coupon: CouponResponse) => void;
};

const minimumPurchaseFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function CouponTable({ coupons, onEdit, onDelete }: CouponTableProps) {
  if (coupons.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay cupones.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mínimo de compra</TableHead>
          <TableHead>Descuento</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {coupons.map((coupon) => (
          <TableRow key={coupon.id}>
            <TableCell>{minimumPurchaseFormatter.format(coupon.minPurchase)}</TableCell>
            <TableCell>
              <CouponDiscountBadge amount={coupon.discountAmount} category={coupon.category} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar cupón de ${formatCouponDiscount(coupon.discountAmount)}`}
                  onClick={() => onEdit(coupon)}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar cupón de ${formatCouponDiscount(coupon.discountAmount)}`}
                  onClick={() => onDelete(coupon)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
