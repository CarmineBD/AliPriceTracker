import type { AliExpressProductVariant } from '@alitracker/shared';
import { ImageOff } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type AliExpressProductsTableProps = {
  products: AliExpressProductVariant[];
};

export function AliExpressProductsTable({ products }: AliExpressProductsTableProps) {
  if (products.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Esta publicación no tiene variantes disponibles.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Imagen</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          <TableHead className="text-right">Cantidad disponible</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id} className={!product.salable ? 'opacity-60' : undefined}>
            <TableCell>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={`Imagen de ${product.name}`}
                  className="size-16 shrink-0 rounded-md border object-cover"
                />
              ) : (
                <div
                  className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                  aria-label={`Sin imagen para ${product.name}`}
                >
                  <ImageOff />
                </div>
              )}
            </TableCell>
            <TableCell className="max-w-96 whitespace-normal">
              <p className="font-medium">{product.name}</p>
              {!product.salable && (
                <p className="mt-1 text-xs text-muted-foreground">No disponible</p>
              )}
            </TableCell>
            <TableCell className="text-right">{product.price ?? '—'}</TableCell>
            <TableCell className="text-right">{product.quantityAvailable}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
