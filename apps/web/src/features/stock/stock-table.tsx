import { useState } from 'react';
import type { StockItem } from '@alitracker/shared';
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

type StockTableProps = {
  stock: StockItem[];
};

type StockRow = Pick<StockItem, 'productId' | 'imageUrl' | 'name' | 'shortName'> & {
  quantity: number;
};

type AvailableStockRowState = 'green' | 'red';

type StockQuantityTableProps = {
  heading: string;
  headingId: string;
  emptyMessage: string;
  rows: StockRow[];
  rowStates?: ReadonlyMap<string, AvailableStockRowState>;
  onRowStateChange?: (productId: string) => void;
};

function StockQuantityTable({
  heading,
  headingId,
  emptyMessage,
  rows,
  rowStates,
  onRowStateChange,
}: StockQuantityTableProps) {
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-xl font-semibold text-slate-900">
        {heading}
      </h2>
      <Table aria-labelledby={headingId} className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Imagen</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Nombre corto</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((product) => {
              const rowState = rowStates?.get(product.productId);
              const isSelectable = onRowStateChange !== undefined;

              return (
                <TableRow
                  key={product.productId}
                  data-state={rowState}
                  aria-selected={isSelectable ? rowState !== undefined : undefined}
                  tabIndex={isSelectable ? 0 : undefined}
                  className={
                    isSelectable
                      ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=green]:bg-green-100 data-[state=green]:hover:bg-green-100 data-[state=red]:bg-red-100 data-[state=red]:hover:bg-red-100'
                      : undefined
                  }
                  onClick={onRowStateChange ? () => onRowStateChange(product.productId) : undefined}
                  onKeyDown={
                    onRowStateChange
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onRowStateChange(product.productId);
                          }
                        }
                      : undefined
                  }
                >
                  <TableCell>
                    <ProductImageLink
                      productId={product.productId}
                      productName={product.name}
                      imageUrl={product.imageUrl}
                      size="lg"
                    />
                  </TableCell>
                  <TableCell className="min-w-56 font-medium">
                    <Link
                      to={`/products/${product.productId}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell>{product.shortName}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {product.quantity}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </section>
  );
}

export function StockTable({ stock }: StockTableProps) {
  const [availableStockRowStates, setAvailableStockRowStates] = useState<
    Map<string, AvailableStockRowState>
  >(() => new Map());
  const availableStock = stock.filter((product) => product.quantity !== 0);
  const orderedStock = stock.flatMap((product) => {
    const pendingReceipt = product.statusLabels.find(({ status }) => status === 'ordered');
    return pendingReceipt ? [{ ...product, quantity: pendingReceipt.quantity }] : [];
  });
  const stockToBeSent = stock.flatMap((product) => {
    const pendingShipment = product.statusLabels.find(({ status }) => status === 'to_be_sent');
    return pendingShipment ? [{ ...product, quantity: pendingShipment.quantity }] : [];
  });
  const cycleAvailableProductRowState = (productId: string) => {
    setAvailableStockRowStates((current) => {
      const next = new Map(current);
      const currentState = current.get(productId);

      if (currentState === 'red') {
        next.delete(productId);
      } else {
        next.set(productId, currentState === 'green' ? 'red' : 'green');
      }
      return next;
    });
  };

  return (
    <div className="space-y-10">
      <StockQuantityTable
        heading="Stock disponible"
        headingId="available-stock-heading"
        emptyMessage="No hay unidades disponibles."
        rows={availableStock}
        rowStates={availableStockRowStates}
        onRowStateChange={cycleAvailableProductRowState}
      />
      <StockQuantityTable
        heading="En camino"
        headingId="ordered-stock-heading"
        emptyMessage="No hay compras pendientes de recibir."
        rows={orderedStock}
      />
      <StockQuantityTable
        heading="Por enviar"
        headingId="to-be-sent-stock-heading"
        emptyMessage="No hay ventas pendientes de enviar."
        rows={stockToBeSent}
      />
    </div>
  );
}
