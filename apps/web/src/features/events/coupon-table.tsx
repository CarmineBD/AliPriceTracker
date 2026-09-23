import type { CouponResponse } from '@alitracker/shared';
import { Pencil, Ticket, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
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
  onCreate?: () => void;
};

const minimumPurchaseFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function CouponTable({ coupons, onEdit, onDelete, onCreate }: CouponTableProps) {
  if (coupons.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="Aún no hay cupones"
        description="Añade los cupones que estarán disponibles para tus eventos."
        action={onCreate ? <Button onClick={onCreate}>Crear cupón</Button> : undefined}
      />
    );
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
