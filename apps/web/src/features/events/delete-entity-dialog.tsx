import type { ReactNode } from 'react';

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

type DeleteEntityDialogProps = {
  entity?: { label: ReactNode; type: 'cupón' | 'evento' };
  isDeleting: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteEntityDialog({
  entity,
  isDeleting,
  error,
  onOpenChange,
  onConfirm,
}: DeleteEntityDialogProps) {
  return (
    <AlertDialog open={Boolean(entity)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {entity?.type ?? 'registro'}?</AlertDialogTitle>
          <AlertDialogDescription>
            {entity ? (
              <>Se eliminará {entity.label}. Esta acción no se puede deshacer.</>
            ) : (
              'Esta acción no se puede deshacer.'
            )}
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
