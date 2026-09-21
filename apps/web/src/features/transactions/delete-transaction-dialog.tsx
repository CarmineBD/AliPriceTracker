import type { PurchaseHistoryEntry, SaleHistoryEntry } from '@alitracker/shared';

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

type DeleteTransactionDialogProps = {
  kind: 'purchase' | 'sale';
  transaction?: PurchaseHistoryEntry | SaleHistoryEntry;
  isDeleting: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteTransactionDialog({
  kind,
  transaction,
  isDeleting,
  error,
  onOpenChange,
  onConfirm,
}: DeleteTransactionDialogProps) {
  const label = kind === 'purchase' ? 'compra' : 'venta';

  return (
    <AlertDialog open={Boolean(transaction)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            {transaction
              ? `Se eliminará el registro de ${transaction.shortName}. Esta acción no se puede deshacer.`
              : 'Esta acción no se puede deshacer.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? 'Eliminando…' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
