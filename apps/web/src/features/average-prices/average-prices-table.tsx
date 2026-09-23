import type { AveragePriceItem } from '@alitracker/shared';
import { ChartNoAxesCombined, ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';

type AveragePricesTableProps = {
  prices: AveragePriceItem[];
  kind: 'purchase' | 'sale';
};

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

export function AveragePricesTable({ prices, kind }: AveragePricesTableProps) {
  const historyLabel = kind === 'sale' ? 'ventas' : 'compras';
  const priceLabel = kind === 'sale' ? 'Precio medio de venta' : 'Precio medio de compra';

  if (prices.length === 0) {
    return (
      <EmptyState
        icon={ChartNoAxesCombined}
        title={`Aún no hay historial de ${historyLabel}`}
        description={`Los precios medios de ${historyLabel} aparecerán al registrar operaciones.`}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Imagen</TableHead>
          <TableHead>Nombre corto</TableHead>
          <TableHead className="text-right">{priceLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prices.map((product) => (
          <TableRow key={product.productId}>
            <TableCell>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={`Imagen de ${product.shortName}`}
                  className="size-10 rounded-md border object-cover"
                />
              ) : (
                <span
                  className="flex size-10 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                  aria-label={`Sin imagen para ${product.shortName}`}
                >
                  <ImageOff className="size-4" />
                </span>
              )}
            </TableCell>
            <TableCell className="font-medium">
              <Link
                to={`/products/${product.productId}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {product.shortName}
              </Link>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {currencyFormatter.format(product.averagePrice)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
