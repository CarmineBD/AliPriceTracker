import type { ProductCombo, ProductOption } from '@alitracker/shared';
import { ImageOff, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FieldLabel } from '@/components/ui/field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductCombobox } from '@/features/aliexpress-products/product-combobox';

type ProductComponentsEditorProps = {
  productId?: string;
  components: ProductCombo[];
  options: ProductOption[];
  optionsLoading: boolean;
  disabled: boolean;
  onChange: (components: ProductCombo[]) => void;
};

export function ProductComponentsEditor({
  productId,
  components,
  options,
  optionsLoading,
  disabled,
  onChange,
}: ProductComponentsEditorProps) {
  const availableOptions = options.filter(
    (option) => option.id !== productId && !components.some((component) => component.containsProductId === option.id),
  );

  const addComponent = (containsProductId: string | undefined) => {
    if (!containsProductId) return;
    const product = options.find((option) => option.id === containsProductId);
    if (!product) return;

    onChange([
      ...components,
      {
        productId: productId ?? '',
        containsProductId: product.id,
        quantity: 1,
        product: {
          id: product.id,
          name: product.name,
          shortName: product.shortName,
          imageKey: product.imageKey ?? null,
          imageUrl: product.imageUrl ?? null,
          averageSellingPrice: null,
          effectiveSellingPrice: null,
        },
      },
    ]);
  };

  return (
    <section className="space-y-3" aria-labelledby="product-components-title">
      <div>
        <FieldLabel id="product-components-title">Productos que contiene</FieldLabel>
        <p className="mt-1 text-sm text-muted-foreground">
          Añade los productos incluidos en este combo. Cada producto se añade con cantidad 1.
        </p>
      </div>
      <ProductCombobox
        options={availableOptions}
        onProductIdChange={addComponent}
        disabled={disabled || optionsLoading}
        ariaLabel="Producto contenido"
        placeholder={optionsLoading ? 'Cargando productos…' : 'Añadir producto contenido...'}
      />
      {components.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este producto no contiene otros productos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagen</TableHead>
              <TableHead>Nombre corto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.map((component) => (
              <TableRow key={component.containsProductId}>
                <TableCell>
                  {component.product.imageUrl ? (
                    <img
                      src={component.product.imageUrl}
                      alt={`Imagen de ${component.product.shortName}`}
                      className="size-10 rounded-md border object-cover"
                    />
                  ) : (
                    <div
                      className="flex size-10 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                      aria-label={`Sin imagen para ${component.product.shortName}`}
                    >
                      <ImageOff className="size-4" />
                    </div>
                  )}
                </TableCell>
                <TableCell>{component.product.shortName}</TableCell>
                <TableCell className="text-right">{component.quantity}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    aria-label={`Eliminar ${component.product.shortName} del combo`}
                    onClick={() =>
                      onChange(
                        components.filter(
                          (current) => current.containsProductId !== component.containsProductId,
                        ),
                      )
                    }
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
