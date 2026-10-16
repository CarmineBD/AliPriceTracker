import type { AveragePriceItem, Opportunity } from '@alitracker/shared';
import { ExternalLink, Info, SearchX } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { CouponDiscountBadge } from '@/components/coupon-discount-badge';
import { ProductImageLink } from '@/components/product-image-link';
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
  averagePurchasePrices: AveragePriceItem[];
};

const amountFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatEuro(amount: number): string {
  return `${amountFormatter.format(amount)} €`;
}

function ProductImage({ opportunity }: { opportunity: Opportunity }) {
  return (
    <ProductImageLink
      productId={opportunity.productId}
      productName={opportunity.shortName}
      imageUrl={opportunity.imageUrl}
    />
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

export function OpportunitiesTable({
  opportunities,
  averagePurchasePrices,
}: OpportunitiesTableProps) {
  const averagePurchasePricesByProductId = new Map(
    averagePurchasePrices.map((price) => [price.productId, price.averagePrice]),
  );

  if (opportunities.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No hay oportunidades disponibles"
        description="No hay productos rentables con el precio de compra, venta y los cupones seleccionados."
      />
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imagen</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Precio medio de compra</TableHead>
            <TableHead className="text-right">Precio final</TableHead>
            <TableHead>Cupón aplicado</TableHead>
            <TableHead className="text-right">Falta para próximo cupón</TableHead>
            <TableHead className="text-right">Beneficio</TableHead>
            <TableHead className="text-right">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opportunity) => {
            const products = [opportunity];
            const label = opportunity.shortName;
            const key = opportunity.productId;
            const averagePurchasePrice = averagePurchasePricesByProductId.get(
              opportunity.productId,
            );
            const finalPriceClassName =
              averagePurchasePrice === undefined
                ? undefined
                : opportunity.effectivePurchasePrice > averagePurchasePrice
                  ? 'text-destructive'
                  : opportunity.effectivePurchasePrice < averagePurchasePrice
                    ? 'text-emerald-700'
                    : undefined;

            return (
              <TableRow key={key}>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {products.map((product) => (
                      <ProductImage key={product.productId} opportunity={product} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="min-w-56 font-medium">
                  <div className="space-y-1">
                    {products.map((product) => (
                      <div key={product.productId}>
                        <ProductName opportunity={product} />
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatEuro(opportunity.basePurchasePrice)}
                </TableCell>
                <TableCell className="text-right">
                  {averagePurchasePrice === undefined ? '—' : formatEuro(averagePurchasePrice)}
                </TableCell>
                <TableCell
                  className={`text-right${finalPriceClassName ? ` ${finalPriceClassName}` : ''}`}
                >
                  {formatEuro(opportunity.effectivePurchasePrice)}
                </TableCell>
                <TableCell>
                  {opportunity.coupon ? (
                    <CouponDiscountBadge
                      amount={opportunity.coupon.discountAmount}
                      minPurchase={opportunity.coupon.minPurchase}
                      category={opportunity.coupon.category}
                    />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {opportunity.amountToNextCoupon === null
                    ? '—'
                    : formatEuro(opportunity.amountToNextCoupon)}
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
                            aria-label={`Ver cálculo del beneficio de ${label}`}
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
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
