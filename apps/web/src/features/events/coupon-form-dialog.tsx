import { useEffect, useState } from 'react';

import type { CouponCreateInput, CouponResponse } from '@alitracker/shared';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type CouponFormDialogProps = {
  open: boolean;
  coupon?: CouponResponse;
  isSaving: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CouponCreateInput) => void;
};

type CouponFormValues = { minPurchase: string; discountAmount: string };

function toValues(coupon?: CouponResponse): CouponFormValues {
  return {
    minPurchase: coupon?.minPurchase.toFixed(2) ?? '',
    discountAmount: coupon?.discountAmount.toFixed(2) ?? '',
  };
}

function parseAmount(value: string): number | undefined {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 9_999_999_999.99 ? amount : undefined;
}

export function CouponFormDialog({
  open,
  coupon,
  isSaving,
  error,
  onOpenChange,
  onSubmit,
}: CouponFormDialogProps) {
  const [values, setValues] = useState<CouponFormValues>(() => toValues(coupon));
  const [amountError, setAmountError] = useState<string>();

  useEffect(() => {
    if (open) {
      setValues(toValues(coupon));
      setAmountError(undefined);
    }
  }, [coupon, open]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minPurchase = parseAmount(values.minPurchase);
    const discountAmount = parseAmount(values.discountAmount);
    if (minPurchase === undefined || discountAmount === undefined) {
      setAmountError('Introduce importes válidos, positivos y con un máximo de dos decimales.');
      return;
    }
    setAmountError(undefined);
    onSubmit({ minPurchase, discountAmount });
  };

  const title = coupon ? 'Editar cupón' : 'Agregar cupón';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent showCloseButton={false}>
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Define el importe mínimo y el descuento del cupón.
            </DialogDescription>
          </DialogHeader>
          <FieldSet disabled={isSaving} className="mt-6">
            <FieldGroup className="gap-4">
              <Field data-invalid={Boolean(amountError)}>
                <FieldLabel htmlFor="coupon-min-purchase">Mínimo de compra (€)</FieldLabel>
                <FieldContent>
                  <Input
                    id="coupon-min-purchase"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={values.minPurchase}
                    required
                    autoFocus
                    onChange={(event) => {
                      setValues((current) => ({ ...current, minPurchase: event.target.value }));
                      if (amountError) setAmountError(undefined);
                    }}
                  />
                </FieldContent>
              </Field>
              <Field data-invalid={Boolean(amountError)}>
                <FieldLabel htmlFor="coupon-discount-amount">Descuento (€)</FieldLabel>
                <FieldContent>
                  <Input
                    id="coupon-discount-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={values.discountAmount}
                    required
                    onChange={(event) => {
                      setValues((current) => ({ ...current, discountAmount: event.target.value }));
                      if (amountError) setAmountError(undefined);
                    }}
                  />
                  <FieldError>{amountError}</FieldError>
                </FieldContent>
              </Field>
            </FieldGroup>
          </FieldSet>
          {error && <FieldError className="mt-6">{error}</FieldError>}
          <DialogFooter className="mt-6">
            <DialogClose render={<Button type="button" variant="outline" disabled={isSaving} />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
