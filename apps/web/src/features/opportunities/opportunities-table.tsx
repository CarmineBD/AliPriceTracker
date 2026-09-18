import type { Opportunity } from '@alitracker/shared';
import { ExternalLink, ImageOff, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CouponDiscountBadge } from '@/components/coupon-discount-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type OpportunitiesTableProps = {
  opportunities: Opportunity[];
};

const amountFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatEuro(amount: number): string {
  return `${amountFormatter.format(amount)} €`;
}

export function OpportunitiesTable({ opportunities }: OpportunitiesTableProps) {
  if (opportunities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay oportunidades disponibles con precio de compra y venta estimada.
      </p>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imagen</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-right">Precio final</TableHead>
            <TableHead>Cupón aplicado</TableHead>
            <TableHead className="text-right">Beneficio</TableHead>
            <TableHead className="text-right">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opportunity) => (
            <TableRow key={opportunity.productId}>
              <TableCell>
                {opportunity.imageUrl ? (
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
                )}
              </TableCell>
              <TableCell className="min-w-56 font-medium">
                {opportunity.offerUrl ? (
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
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatEuro(opportunity.effectivePurchasePrice)}
              </TableCell>
              <TableCell>
                {opportunity.coupon ? (
                  <CouponDiscountBadge amount={opportunity.coupon.discountAmount} />
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <span>{formatEuro(opportunity.estimatedProfit)}</span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Ver cálculo del beneficio de ${opportunity.shortName}`}
                        />
                      }
                    >
                      <Info />
                    </TooltipTrigger>
                    <TooltipContent>
                      Calculado con precio de venta estimado de{' '}
                      {formatEuro(opportunity.estimatedSellingPrice)}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {opportunity.roi === null ? (
                  '—'
                ) : (
                  <Badge variant="secondary">{amountFormatter.format(opportunity.roi)} %</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
