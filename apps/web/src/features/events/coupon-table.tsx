import type { CouponResponse } from '@alitracker/shared';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  CouponDiscountBadge,
  formatCouponAmount,
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

export function CouponTable({ coupons, onEdit, onDelete }: CouponTableProps) {
  if (coupons.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay cupones.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right">Mínimo de compra</TableHead>
          <TableHead className="text-right">Descuento</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {coupons.map((coupon) => (
          <TableRow key={coupon.id}>
            <TableCell className="text-right">{formatCouponAmount(coupon.minPurchase)}</TableCell>
            <TableCell className="text-right">
              <CouponDiscountBadge amount={coupon.discountAmount} />
            </TableCell>
            <TableCell>
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
