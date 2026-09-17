import { useEffect, useState } from 'react';

import type { ActiveEvent, Coupon, EventSaveInput } from '@alitracker/shared';

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
import { EventCouponsEditor } from './event-coupons-editor';

type EventFormDialogProps = {
  open: boolean;
  event?: ActiveEvent;
  couponOptions: Coupon[];
  couponOptionsLoading: boolean;
  isSaving: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: EventSaveInput) => void;
};

type EventFormValues = { name: string; startsAt: string; endsAt: string };

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toValues(event?: ActiveEvent): EventFormValues {
  return {
    name: event?.name ?? '',
    startsAt: event ? toLocalDateTime(event.startsAt) : '',
    endsAt: event ? toLocalDateTime(event.endsAt) : '',
  };
}

export function EventFormDialog({
  open,
  event,
  couponOptions,
  couponOptionsLoading,
  isSaving,
  error,
  onOpenChange,
  onSubmit,
}: EventFormDialogProps) {
  const [values, setValues] = useState<EventFormValues>(() => toValues(event));
  const [selectedCoupons, setSelectedCoupons] = useState<Coupon[]>(event?.coupons ?? []);
  const [nameError, setNameError] = useState<string>();
  const [datesError, setDatesError] = useState<string>();

  useEffect(() => {
    if (open) {
      setValues(toValues(event));
      setSelectedCoupons(event?.coupons ?? []);
      setNameError(undefined);
      setDatesError(undefined);
    }
  }, [event, open]);

  const submit = (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const name = values.name.trim();
    if (!name) {
      setNameError('El nombre es obligatorio.');
      return;
    }

    const startsAt = new Date(values.startsAt);
    const endsAt = new Date(values.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      setDatesError('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    setNameError(undefined);
    setDatesError(undefined);
    onSubmit({
      name,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      couponIds: selectedCoupons.map((coupon) => coupon.id),
    });
  };

  const title = event ? 'Editar evento' : 'Agregar evento';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] max-w-lg overflow-y-auto">
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Define el periodo del evento y sus cupones disponibles.
            </DialogDescription>
          </DialogHeader>
          <FieldSet disabled={isSaving || couponOptionsLoading} className="mt-6">
            <FieldGroup className="gap-4">
              <Field data-invalid={Boolean(nameError)}>
                <FieldLabel htmlFor="event-name">Nombre</FieldLabel>
                <FieldContent>
                  <Input
                    id="event-name"
                    value={values.name}
                    maxLength={160}
                    required
                    autoFocus
                    onChange={(inputEvent) => {
                      setValues((current) => ({ ...current, name: inputEvent.target.value }));
                      if (nameError) setNameError(undefined);
                    }}
                  />
                  <FieldError>{nameError}</FieldError>
                </FieldContent>
              </Field>
              <Field data-invalid={Boolean(datesError)}>
                <FieldLabel htmlFor="event-starts-at">Inicio</FieldLabel>
                <FieldContent>
                  <Input
                    id="event-starts-at"
                    type="datetime-local"
                    value={values.startsAt}
                    required
                    onChange={(inputEvent) => {
                      setValues((current) => ({ ...current, startsAt: inputEvent.target.value }));
                      if (datesError) setDatesError(undefined);
                    }}
                  />
                </FieldContent>
              </Field>
              <Field data-invalid={Boolean(datesError)}>
                <FieldLabel htmlFor="event-ends-at">Fin</FieldLabel>
                <FieldContent>
                  <Input
                    id="event-ends-at"
                    type="datetime-local"
                    value={values.endsAt}
                    required
                    onChange={(inputEvent) => {
                      setValues((current) => ({ ...current, endsAt: inputEvent.target.value }));
                      if (datesError) setDatesError(undefined);
                    }}
                  />
                  <FieldError>{datesError}</FieldError>
                </FieldContent>
              </Field>
              <EventCouponsEditor
                coupons={selectedCoupons}
                options={couponOptions}
                optionsLoading={couponOptionsLoading}
                disabled={isSaving}
                onChange={setSelectedCoupons}
              />
            </FieldGroup>
          </FieldSet>
          {error && <FieldError className="mt-6">{error}</FieldError>}
          <DialogFooter className="mt-6">
            <DialogClose render={<Button type="button" variant="outline" disabled={isSaving} />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={isSaving || couponOptionsLoading}>
              {isSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
