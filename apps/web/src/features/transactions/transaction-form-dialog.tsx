import { useEffect, useState } from 'react';

import type {
  ProductOffer,
  ProductOption,
  PurchaseCreateInput,
  PurchaseHistoryEntry,
  PurchaseStatus,
  SaleCreateInput,
  SaleHistoryEntry,
  SaleStatus,
} from '@alitracker/shared';
import { useQuery } from '@tanstack/react-query';

import { getProduct } from '@/api/products.api';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
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
import { ProductCombobox } from '@/features/products/product-combobox';

type TransactionKind = 'purchase' | 'sale';
type Transaction = PurchaseHistoryEntry | SaleHistoryEntry;
type StatusOption = { value: PurchaseStatus | SaleStatus; label: string };

type TransactionFormDialogProps = {
  kind: TransactionKind;
  open: boolean;
  transaction?: Transaction;
  productOptions: ProductOption[];
  productOptionsLoading: boolean;
  isSaving: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: PurchaseCreateInput | SaleCreateInput) => void;
};

type FormValues = {
  date: string;
  productId: string;
  offerId: string;
  amount: string;
  shippingCost: string;
  status: string;
};

const purchaseStatuses: StatusOption[] = [
  { value: 'ordered', label: 'Pedido' },
  { value: 'received', label: 'Recibido' },
  { value: 'returned', label: 'Devuelto' },
];

const saleStatuses: StatusOption[] = [
  { value: 'to_be_sent', label: 'Por enviar' },
  { value: 'sent', label: 'Enviado' },
  { value: 'completed', label: 'Completado' },
];

function toDateInputValue(date: Date): string {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
}

function toValues(kind: TransactionKind, transaction?: Transaction): FormValues {
  const isPurchase = transaction !== undefined && 'offerId' in transaction;
  const amount =
    transaction === undefined
      ? ''
      : 'totalFinalPrice' in transaction
        ? transaction.totalFinalPrice.toFixed(2)
        : transaction.totalSalePrice.toFixed(2);
  return {
    date: transaction ? toDateInputValue(new Date(transaction.date)) : toDateInputValue(new Date()),
    productId: transaction?.productId ?? '',
    offerId: isPurchase ? (transaction.offerId ?? '') : '',
    amount,
    shippingCost:
      transaction !== undefined && 'shippingCost' in transaction
        ? transaction.shippingCost.toFixed(2)
        : '0.00',
    status: transaction?.status ?? (kind === 'purchase' ? 'ordered' : 'to_be_sent'),
  };
}

function parseAmount(value: string): number | undefined {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 9_999_999_999.99 ? amount : undefined;
}

function offerLabel(offer: ProductOffer): string {
  const seller = offer.sellerName ?? 'Vendedor sin nombre';
  const price =
    offer.price === null ? 'Precio no disponible' : `${offer.price} ${offer.currency ?? ''}`;
  return `${seller} — ${price}`;
}

export function sortOffersByPrice(offers: ProductOffer[]): ProductOffer[] {
  return [...offers].sort((first, second) => {
    if (first.price === null) return second.price === null ? first.id.localeCompare(second.id) : 1;
    if (second.price === null) return -1;

    return Number(first.price) - Number(second.price) || first.id.localeCompare(second.id);
  });
}

export function TransactionFormDialog({
  kind,
  open,
  transaction,
  productOptions,
  productOptionsLoading,
  isSaving,
  error,
  onOpenChange,
  onSubmit,
}: TransactionFormDialogProps) {
  const [values, setValues] = useState<FormValues>(() => toValues(kind, transaction));
  const [formError, setFormError] = useState<string>();
  const selectedProductQuery = useQuery({
    queryKey: ['product', values.productId],
    queryFn: () => getProduct(values.productId),
    enabled: open && kind === 'purchase' && Boolean(values.productId),
  });
  const offerOptions = sortOffersByPrice(selectedProductQuery.data?.offers ?? []);
  const selectedOffer = offerOptions.find((offer) => offer.id === values.offerId) ?? null;
  const statusOptions = kind === 'purchase' ? purchaseStatuses : saleStatuses;
  const selectedStatus = statusOptions.find((option) => option.value === values.status) ?? null;

  useEffect(() => {
    if (open) {
      setValues(toValues(kind, transaction));
      setFormError(undefined);
    }
  }, [kind, open, transaction]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = parseAmount(values.amount);
    const shippingCost = parseAmount(values.shippingCost);
    if (
      !values.date ||
      !values.productId ||
      amount === undefined ||
      (kind === 'sale' && shippingCost === undefined)
    ) {
      setFormError('Completa la fecha, el producto y un precio válido.');
      return;
    }
    const date = new Date(`${values.date}T12:00:00`).toISOString();
    setFormError(undefined);
    if (kind === 'purchase') {
      onSubmit({
        productId: values.productId,
        offerId: values.offerId || null,
        totalFinalPrice: amount,
        status: values.status as PurchaseStatus,
        date,
      });
      return;
    }
    onSubmit({
      productId: values.productId,
      totalSalePrice: amount,
      shippingCost: shippingCost ?? 0,
      status: values.status as SaleStatus,
      date,
    });
  };

  const label = kind === 'purchase' ? 'compra' : 'venta';
  const title = transaction ? `Editar ${label}` : 'Añadir registro';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] max-w-lg overflow-y-auto">
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Registra los datos de la {label} para mantener el historial actualizado.
            </DialogDescription>
          </DialogHeader>
          <FieldSet disabled={isSaving} className="mt-6">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor={`${kind}-date`}>Fecha</FieldLabel>
                <FieldContent>
                  <Input
                    id={`${kind}-date`}
                    type="date"
                    value={values.date}
                    required
                    onChange={(inputEvent) =>
                      setValues((current) => ({ ...current, date: inputEvent.target.value }))
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Producto</FieldLabel>
                <FieldContent>
                  <ProductCombobox
                    options={productOptions}
                    productId={values.productId || undefined}
                    disabled={isSaving}
                    autoFocus
                    invalid={Boolean(formError) && !values.productId}
                    ariaLabel="Seleccionar producto"
                    onProductIdChange={(productId) => {
                      setValues((current) => ({
                        ...current,
                        productId: productId ?? '',
                        offerId: productId === current.productId ? current.offerId : '',
                      }));
                      if (formError) setFormError(undefined);
                    }}
                  />
                </FieldContent>
              </Field>
              {kind === 'purchase' && (
                <Field>
                  <FieldLabel>Oferta o publicación (opcional)</FieldLabel>
                  <FieldContent>
                    <Combobox
                      items={offerOptions}
                      value={selectedOffer}
                      onValueChange={(offer) => {
                        setValues((current) => ({
                          ...current,
                          offerId: offer?.id ?? '',
                          amount: offer?.price ?? '',
                        }));
                        if (formError) setFormError(undefined);
                      }}
                      itemToStringLabel={offerLabel}
                      itemToStringValue={(offer) => offer.id}
                    >
                      <ComboboxInput
                        placeholder={
                          values.productId
                            ? 'Seleccionar oferta...'
                            : 'Selecciona primero un producto...'
                        }
                        aria-label="Seleccionar oferta o publicación"
                        disabled={!values.productId || selectedProductQuery.isPending}
                      />
                      <ComboboxContent>
                        <ComboboxList>
                          {(offer: ProductOffer) => (
                            <ComboboxItem key={offer.id} value={offer}>
                              <span className="flex min-w-0 flex-col items-start">
                                <span>{offerLabel(offer)}</span>
                                <span className="max-w-80 truncate text-xs text-muted-foreground">
                                  {offer.url}
                                </span>
                              </span>
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                        <ComboboxEmpty>
                          No hay ofertas disponibles para este producto.
                        </ComboboxEmpty>
                      </ComboboxContent>
                    </Combobox>
                  </FieldContent>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor={`${kind}-amount`}>
                  {kind === 'purchase' ? 'Precio final' : 'Precio de venta'}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id={`${kind}-amount`}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={values.amount}
                    required
                    onChange={(inputEvent) => {
                      setValues((current) => ({ ...current, amount: inputEvent.target.value }));
                      if (formError) setFormError(undefined);
                    }}
                  />
                </FieldContent>
              </Field>
              {kind === 'sale' && (
                <Field>
                  <FieldLabel htmlFor="sale-shipping-cost">Coste de envío asumido</FieldLabel>
                  <FieldContent>
                    <Input
                      id="sale-shipping-cost"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={values.shippingCost}
                      required
                      onChange={(inputEvent) => {
                        setValues((current) => ({
                          ...current,
                          shippingCost: inputEvent.target.value,
                        }));
                        if (formError) setFormError(undefined);
                      }}
                    />
                  </FieldContent>
                </Field>
              )}
              <Field>
                <FieldLabel>Estado</FieldLabel>
                <FieldContent>
                  <Combobox
                    items={statusOptions}
                    value={selectedStatus}
                    onValueChange={(option) =>
                      setValues((current) => ({
                        ...current,
                        status: option?.value ?? current.status,
                      }))
                    }
                    itemToStringLabel={(option) => option.label}
                    itemToStringValue={(option) => option.value}
                  >
                    <ComboboxInput aria-label="Seleccionar estado" readOnly />
                    <ComboboxContent>
                      <ComboboxList>
                        {(option: StatusOption) => (
                          <ComboboxItem key={option.value} value={option}>
                            {option.label}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </FieldContent>
              </Field>
            </FieldGroup>
          </FieldSet>
          {(formError || error) && <FieldError className="mt-6">{formError ?? error}</FieldError>}
          <DialogFooter className="mt-6">
            <DialogClose render={<Button type="button" variant="outline" disabled={isSaving} />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={isSaving || productOptionsLoading}>
              {isSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
