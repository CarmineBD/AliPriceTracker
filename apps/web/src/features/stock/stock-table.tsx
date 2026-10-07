import type { StockItem } from '@alitracker/shared';
import { ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';

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

type StockQuantityTableProps = {
  heading: string;
  headingId: string;
  emptyMessage: string;
  rows: StockRow[];
};

function StockQuantityTable({
  heading,
  headingId,
  emptyMessage,
  rows,
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
            rows.map((product) => (
              <TableRow key={product.productId}>
                <TableCell>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={`Imagen de ${product.name}`}
                      className="size-12 shrink-0 rounded-md border object-cover"
                    />
                  ) : (
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                      aria-label={`Sin imagen para ${product.name}`}
                    >
                      <ImageOff className="size-4" />
                    </div>
                  )}
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
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}

export function StockTable({ stock }: StockTableProps) {
  const availableStock = stock.filter((product) => product.quantity !== 0);
  const orderedStock = stock.flatMap((product) => {
    const pendingReceipt = product.statusLabels.find(({ status }) => status === 'ordered');
    return pendingReceipt ? [{ ...product, quantity: pendingReceipt.quantity }] : [];
  });
  const stockToBeSent = stock.flatMap((product) => {
    const pendingShipment = product.statusLabels.find(({ status }) => status === 'to_be_sent');
    return pendingShipment ? [{ ...product, quantity: pendingShipment.quantity }] : [];
  });

  return (
    <div className="space-y-10">
      <StockQuantityTable
        heading="Stock disponible"
        headingId="available-stock-heading"
        emptyMessage="No hay unidades disponibles."
        rows={availableStock}
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
