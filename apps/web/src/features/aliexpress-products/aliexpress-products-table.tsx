import type { AliExpressProductVariant, ProductOption } from '@alitracker/shared';
import { ImageOff, PackageOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { ProductCombobox } from '@/features/products/product-combobox';
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
  productOptions: ProductOption[];
  associations: Record<string, string | undefined>;
  showValidation: boolean;
  onAssociationChange: (aliexpressSkuId: string, productId: string | undefined) => void;
};

export function AliExpressProductsTable({
  products,
  productOptions,
  associations,
  showValidation,
  onAssociationChange,
}: AliExpressProductsTableProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="Esta publicación no tiene variantes disponibles"
        description="No hay variantes que se puedan asociar a productos internos."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imagen</TableHead>
            <TableHead>Variante</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Máx. compra</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>En el sistema</TableHead>
            <TableHead className="min-w-64">Producto asociado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const associatedProductId = Object.hasOwn(associations, product.aliexpressSkuId)
              ? associations[product.aliexpressSkuId]
              : product.productId ?? undefined;
            const isPending = showValidation && !associatedProductId;

            return (
              <TableRow key={product.aliexpressSkuId}>
                <TableCell>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={`Imagen de ${product.variantName ?? product.aliexpressSkuId}`}
                      className="size-16 shrink-0 rounded-md border object-cover"
                    />
                  ) : (
                    <div
                      className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                      aria-label={`Sin imagen para ${product.variantName ?? product.aliexpressSkuId}`}
                    >
                      <ImageOff />
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-72 whitespace-normal">
                  <p className="font-medium">{product.variantName ?? product.aliexpressSkuId}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {product.aliexpressSkuId}
                  </p>
                </TableCell>
                <TableCell className="text-right">{product.price ?? '—'}</TableCell>
                <TableCell className="text-right">{product.quantityAvailable ?? '—'}</TableCell>
                <TableCell className="text-right">{product.maxPurchase ?? '—'}</TableCell>
                <TableCell>
                  <span
                    className={
                      product.salable
                        ? 'text-sm font-medium text-emerald-700'
                        : 'text-sm text-muted-foreground'
                    }
                  >
                    {product.salable ? 'Disponible' : 'No disponible'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={product.isImported ? 'secondary' : 'outline'}>
                    {product.isImported ? 'Añadido' : 'Pendiente'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ProductCombobox
                    options={productOptions}
                    productId={associatedProductId}
                    onProductIdChange={(productId) =>
                      onAssociationChange(product.aliexpressSkuId, productId)
                    }
                    invalid={isPending}
                  />
                  {isPending && (
                    <p className="mt-1 text-xs text-destructive">Selecciona un producto.</p>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
