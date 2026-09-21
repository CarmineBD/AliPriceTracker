import type { StockItem } from '@alitracker/shared';
import { ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
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

function labelVariant(status: StockItem['statusLabels'][number]['status']) {
  return status === 'to_be_sent' ? 'secondary' : 'outline';
}

export function StockTable({ stock }: StockTableProps) {
  if (stock.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aún no hay productos en stock.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Imagen</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Nombre corto</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stock.map((product) => (
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
            <TableCell>
              {product.statusLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {product.statusLabels.map((statusLabel) => (
                    <Badge key={statusLabel.status} variant={labelVariant(statusLabel.status)}>
                      {statusLabel.label} ({statusLabel.quantity})
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">Disponible</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
