import type { Product } from '@alitracker/shared';
import { Copy, Eye, ImageOff, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
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

async function copyProductId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    toast({ title: 'ID copiado correctamente.' });
  } catch {
    toast({ title: 'No se pudo copiar el ID.', type: 'error' });
  }
}

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
          <TableHead>Nombre corto</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const productLabel = product.shortName ?? product.name;

          return (
            <TableRow key={product.id}>
              <TableCell>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={`Imagen de ${productLabel}`}
                    className="size-16 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <div
                    className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                    aria-label={`Sin imagen para ${productLabel}`}
                  >
                    <ImageOff />
                  </div>
                )}
              </TableCell>
              <TableCell className="max-w-56">
                <div className="flex items-center gap-1">
                  <span className="truncate font-mono text-xs" title={product.id}>
                    {product.id}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    onClick={() => void copyProductId(product.id)}
                    aria-label={`Copiar ID de ${productLabel}`}
                  >
                    <Copy />
                  </Button>
                </div>
              </TableCell>
              <TableCell>{product.shortName ?? '—'}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link to={`/products/${product.id}`} />}
                    nativeButton={false}
                    aria-label={`Ver detalle de ${productLabel}`}
                  >
                    <Eye />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(product)}
                    aria-label={`Editar ${productLabel}`}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(product)}
                    aria-label={`Eliminar ${productLabel}`}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
