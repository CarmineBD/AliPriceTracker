import type { BestCouponCombination, Opportunity } from '@alitracker/shared';
import { ImageOff, SearchX } from 'lucide-react';

import { CouponDiscountBadge } from '@/components/coupon-discount-badge';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type BestCouponCombinationsTableProps = {
  combinations: BestCouponCombination[];
  selectedCombinationIds: string[];
  onSelectedCombinationIdsChange: (combinationIds: string[]) => void;
};

const roiFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function ProductOption({ opportunity }: { opportunity: Opportunity | undefined }) {
  if (!opportunity) return '—';

  return opportunity.offerUrl ? (
    <a
      href={opportunity.offerUrl}
      target="_blank"
      rel="noreferrer"
      className="font-medium hover:underline"
    >
      {opportunity.shortName}
    </a>
  ) : (
    <span className="font-medium">{opportunity.shortName}</span>
  );
}

function ProductImage({ opportunity }: { opportunity: Opportunity }) {
  return opportunity.imageUrl ? (
    <img
      src={opportunity.imageUrl}
      alt={`Imagen de ${opportunity.shortName}`}
      className="size-10 shrink-0 rounded-md border object-cover"
    />
  ) : (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
      aria-label={`Sin imagen para ${opportunity.shortName}`}
    >
      <ImageOff className="size-4" />
    </div>
  );
}

export function BestCouponCombinationsTable({
  combinations,
  selectedCombinationIds,
  onSelectedCombinationIdsChange,
}: BestCouponCombinationsTableProps) {
  if (combinations.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No hay combinaciones rentables"
        description="Prueba a cambiar los cupones o la base del precio de venta."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <span className="sr-only">Incluir en el cálculo</span>
          </TableHead>
          <TableHead>Cupón</TableHead>
          <TableHead>Imagen</TableHead>
          <TableHead>Nombre corto</TableHead>
          <TableHead className="text-right">Precio final</TableHead>
          <TableHead className="text-right">Beneficio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {combinations.map((combination) => (
          <TableRow key={combination.coupon.id}>
            <TableCell>
              <Checkbox
                checked={selectedCombinationIds.includes(combination.coupon.id)}
                onCheckedChange={(checked) => {
                  const nextIds = checked
                    ? [...selectedCombinationIds, combination.coupon.id]
                    : selectedCombinationIds.filter((id) => id !== combination.coupon.id);
                  onSelectedCombinationIdsChange(nextIds);
                }}
                aria-label={`Incluir ${combination.products.map((product) => product.shortName).join(', ')} con este cupón`}
              />
            </TableCell>
            <TableCell>
              <CouponDiscountBadge
                amount={combination.coupon.discountAmount}
                category={combination.coupon.category}
              />
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-2">
                {combination.products.map((product) => (
                  <ProductImage key={product.productId} opportunity={product} />
                ))}
              </div>
            </TableCell>
            <TableCell className="min-w-48">
              <div className="space-y-1">
                {combination.products.map((product) => (
                  <div key={product.productId} className="flex min-h-10 items-center">
                    <ProductOption opportunity={product} />
                  </div>
                ))}
              </div>
            </TableCell>
            <TableCell className="text-right">
              {roiFormatter.format(combination.effectivePurchasePrice)} €
            </TableCell>
            <TableCell className="text-right">
              <div className="flex flex-col items-end gap-1">
                <span>{roiFormatter.format(combination.estimatedProfit)} €</span>
                <Badge variant="secondary">{roiFormatter.format(combination.roi)} %</Badge>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
