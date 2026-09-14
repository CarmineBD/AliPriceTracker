import type { Product } from '@alitracker/shared';
import { ImageOff, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type ProductsTableProps = {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

const formatDate = (value: string) => new Date(value).toLocaleString();

export function ProductsTable({ products, onEdit, onDelete }: ProductsTableProps) {
  if (products.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay productos.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Imagen</TableHead>
          <TableHead>ID</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Nombre corto</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Creado</TableHead>
          <TableHead>Actualizado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={`Imagen de ${product.name}`}
                  className="size-12 rounded-md border object-cover"
                />
              ) : (
                <div
                  className="flex size-12 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                  aria-label={`Sin imagen para ${product.name}`}
                >
                  <ImageOff />
                </div>
              )}
            </TableCell>
            <TableCell className="max-w-48 truncate font-mono text-xs" title={product.id}>
              {product.id}
            </TableCell>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>{product.shortName ?? '—'}</TableCell>
            <TableCell className="max-w-64 whitespace-normal">{product.description ?? '—'}</TableCell>
            <TableCell>{formatDate(product.createdAt)}</TableCell>
            <TableCell>{formatDate(product.updatedAt)}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(product)}
                  aria-label={`Editar ${product.name}`}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(product)}
                  aria-label={`Eliminar ${product.name}`}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
