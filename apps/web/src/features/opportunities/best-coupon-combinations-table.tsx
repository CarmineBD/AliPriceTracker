import type { BestCouponCombination, Opportunity } from '@alitracker/shared';
import { ImageOff } from 'lucide-react';

import { CouponDiscountBadge } from '@/components/coupon-discount-badge';
import { Checkbox } from '@/components/ui/checkbox';
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
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay combinaciones rentables para los cupones seleccionados.
      </p>
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
          <TableHead className="text-right">Beneficio</TableHead>
          <TableHead className="text-right">ROI</TableHead>
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
                aria-label={`Incluir ${combination.options[0]!.shortName} con este cupón`}
              />
            </TableCell>
            <TableCell>
              <CouponDiscountBadge
                amount={combination.coupon.discountAmount}
                category={combination.coupon.category}
              />
            </TableCell>
            <TableCell>
              <ProductImage opportunity={combination.options[0]!} />
            </TableCell>
            <TableCell className="min-w-48">
              <ProductOption opportunity={combination.options[0]} />
            </TableCell>
            <TableCell className="text-right">
              {roiFormatter.format(combination.options[0]!.estimatedProfit)} €
            </TableCell>
            <TableCell className="text-right">
              {combination.options[0]!.roi === null
                ? '—'
                : `${roiFormatter.format(combination.options[0]!.roi)} %`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
