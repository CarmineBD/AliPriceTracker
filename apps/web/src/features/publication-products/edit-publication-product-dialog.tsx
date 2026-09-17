import type { ProductOption } from '@alitracker/shared';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProductCombobox } from '@/features/aliexpress-products/product-combobox';

export function EditPublicationProductDialog({
  open,
  productName,
  currentProductId,
  options,
  optionsLoading,
  isSaving,
  error,
  onOpenChange,
  onProductIdChange,
  onConfirm,
}: {
  open: boolean;
  productName: string;
  currentProductId: string;
  options: ProductOption[];
  optionsLoading: boolean;
  isSaving: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onProductIdChange: (productId: string | undefined) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar producto asociado</DialogTitle>
          <DialogDescription>
            Cambia el producto al que pertenece esta publicación.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label htmlFor="publication-product-product">Producto</label>
          {optionsLoading ? (
            <p className="text-sm text-muted-foreground" role="status">
              Cargando productos…
            </p>
          ) : (
            <ProductCombobox
              options={options}
              productId={currentProductId}
              onProductIdChange={onProductIdChange}
            />
          )}
          <p id="publication-product-current" className="text-xs text-muted-foreground">
            Asociación actual: {productName}
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSaving || optionsLoading}>
            {isSaving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
