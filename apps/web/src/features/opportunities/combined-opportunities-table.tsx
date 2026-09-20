import type { BestCouponCombination, Opportunity } from '@alitracker/shared';
import { ExternalLink, ImageOff } from 'lucide-react';

import { CouponDiscountBadge } from '@/components/coupon-discount-badge';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type CombinedOpportunitiesTableProps = {
  opportunities: BestCouponCombination[];
};

const amountFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatEuro(amount: number): string {
  return `${amountFormatter.format(amount)} €`;
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

function ProductName({ opportunity }: { opportunity: Opportunity }) {
  return opportunity.offerUrl ? (
    <a
      href={opportunity.offerUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 hover:underline"
    >
      {opportunity.shortName} <ExternalLink className="size-3" />
    </a>
  ) : (
    opportunity.shortName
  );
}

export function CombinedOpportunitiesTable({ opportunities }: CombinedOpportunitiesTableProps) {
  if (opportunities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay oportunidades combinadas rentables para los cupones seleccionados.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cupón</TableHead>
          <TableHead>Productos</TableHead>
          <TableHead className="text-right">Precio final</TableHead>
          <TableHead className="text-right">Beneficio</TableHead>
          <TableHead className="text-right">ROI</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {opportunities.map((opportunity) => (
          <TableRow key={opportunity.coupon.id}>
            <TableCell>
              <CouponDiscountBadge
                amount={opportunity.coupon.discountAmount}
                category={opportunity.coupon.category}
              />
            </TableCell>
            <TableCell className="min-w-72">
              <div className="space-y-2">
                {opportunity.products.map((product) => (
                  <div key={product.productId} className="flex items-center gap-2">
                    <ProductImage opportunity={product} />
                    <ProductName opportunity={product} />
                  </div>
                ))}
              </div>
            </TableCell>
            <TableCell className="text-right">
              {formatEuro(opportunity.effectivePurchasePrice)}
            </TableCell>
            <TableCell className="text-right">{formatEuro(opportunity.estimatedProfit)}</TableCell>
            <TableCell className="text-right">
              <Badge variant="secondary">{amountFormatter.format(opportunity.roi)} %</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
