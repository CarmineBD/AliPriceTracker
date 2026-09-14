import type { Product } from '@alitracker/shared';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type DeleteProductDialogProps = {
  product?: Product;
  isDeleting: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteProductDialog({
  product,
  isDeleting,
  error,
  onOpenChange,
  onConfirm,
}: DeleteProductDialogProps) {
  return (
    <AlertDialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
          <AlertDialogDescription>
            {product
              ? `Se eliminará “${product.name}”. Esta acción no se puede deshacer.`
              : 'Esta acción no se puede deshacer.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Eliminando…' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
