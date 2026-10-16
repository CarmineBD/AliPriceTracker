import type { AveragePriceItem } from '@alitracker/shared';
import { ChartNoAxesCombined } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ProductImageLink } from '@/components/product-image-link';
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
  sales: AveragePriceItem[];
  purchases: AveragePriceItem[];
};

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

const roiFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
});

const negativeRoiFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type AveragePriceRow = {
  productId: string;
  imageUrl: string | null;
  shortName: string;
  averagePurchasePrice?: number;
  averageSalePrice?: number;
};

function mergeAveragePrices(
  sales: AveragePriceItem[],
  purchases: AveragePriceItem[],
): AveragePriceRow[] {
  const productsById = new Map<string, AveragePriceRow>();

  for (const sale of sales) {
    productsById.set(sale.productId, {
      productId: sale.productId,
      imageUrl: sale.imageUrl,
      shortName: sale.shortName,
      averageSalePrice: sale.averagePrice,
    });
  }

  for (const purchase of purchases) {
    const existingProduct = productsById.get(purchase.productId);
    productsById.set(purchase.productId, {
      productId: purchase.productId,
      imageUrl: existingProduct?.imageUrl ?? purchase.imageUrl,
      shortName: existingProduct?.shortName ?? purchase.shortName,
      averageSalePrice: existingProduct?.averageSalePrice,
      averagePurchasePrice: purchase.averagePrice,
    });
  }

  return [...productsById.values()].sort(
    (left, right) =>
      left.shortName.localeCompare(right.shortName) ||
      left.productId.localeCompare(right.productId),
  );
}

function formatRoi(roi: number): string {
  const formatter = roi < 0 ? negativeRoiFormatter : roiFormatter;
  return `${formatter.format(roi)} %`;
}

export function AveragePricesTable({ sales, purchases }: AveragePricesTableProps) {
  const products = mergeAveragePrices(sales, purchases);

  if (products.length === 0) {
    return (
      <EmptyState
        icon={ChartNoAxesCombined}
        title="Aún no hay historial de precios"
        description="Los precios medios aparecerán al registrar compras o ventas."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Imagen</TableHead>
          <TableHead>Nombre corto</TableHead>
          <TableHead className="text-right">Precio medio de compra</TableHead>
          <TableHead className="text-right">Precio medio de venta</TableHead>
          <TableHead className="text-right">Beneficio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const averagePurchasePrice = product.averagePurchasePrice;
          const profit =
            product.averageSalePrice === undefined || product.averagePurchasePrice === undefined
              ? null
              : product.averageSalePrice - product.averagePurchasePrice;
          const roi =
            profit === null || averagePurchasePrice === undefined || averagePurchasePrice === 0
              ? null
              : (profit / averagePurchasePrice) * 100;

          return (
            <TableRow key={product.productId}>
              <TableCell>
                <ProductImageLink
                  productId={product.productId}
                  productName={product.shortName}
                  imageUrl={product.imageUrl}
                />
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
                {product.averagePurchasePrice === undefined
                  ? '-'
                  : currencyFormatter.format(product.averagePurchasePrice)}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {product.averageSalePrice === undefined
                  ? '-'
                  : currencyFormatter.format(product.averageSalePrice)}
              </TableCell>
              <TableCell
                className={`text-right font-medium tabular-nums${profit !== null && profit < 0 ? ' text-destructive' : ''}`}
              >
                {profit === null ? (
                  '-'
                ) : (
                  <>
                    {currencyFormatter.format(profit)}
                    {roi !== null && (
                      <span className="ml-1 text-muted-foreground">(ROI {formatRoi(roi)})</span>
                    )}
                  </>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
