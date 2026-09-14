import { useEffect, useState } from 'react';

import type { Product, ProductCreateInput } from '@alitracker/shared';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type ProductFormValues = {
  name: string;
  shortName: string;
  iconUrl: string;
  description: string;
};

const emptyValues: ProductFormValues = {
  name: '',
  shortName: '',
  iconUrl: '',
  description: '',
};

function toFormValues(product?: Product): ProductFormValues {
  if (!product) {
    return emptyValues;
  }

  return {
    name: product.name,
    shortName: product.shortName ?? '',
    iconUrl: product.iconUrl ?? '',
    description: product.description ?? '',
  };
}

type ProductFormDialogProps = {
  open: boolean;
  product?: Product;
  isSaving: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ProductCreateInput) => void;
};

export function ProductFormDialog({
  open,
  product,
  isSaving,
  error,
  onOpenChange,
  onSubmit,
}: ProductFormDialogProps) {
  const [values, setValues] = useState<ProductFormValues>(() => toFormValues(product));
  const [nameError, setNameError] = useState<string>();

  useEffect(() => {
    if (open) {
      setValues(toFormValues(product));
      setNameError(undefined);
    }
  }, [open, product]);

  const setValue = (field: keyof ProductFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = values.name.trim();

    if (!name) {
      setNameError('El nombre es obligatorio.');
      return;
    }

    onSubmit({
      name,
      shortName: values.shortName,
      iconUrl: values.iconUrl,
      description: values.description,
    });
  };

  const isEditing = Boolean(product);
  const title = isEditing ? 'Editar producto' : 'Agregar producto';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <form onSubmit={submit}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>
              {isEditing
                ? 'Actualiza los datos del producto y guarda los cambios.'
                : 'Completa los datos para registrar un nuevo producto.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <FieldGroup className="mt-6 gap-4">
            {product && (
              <Field>
                <FieldLabel htmlFor="product-id">ID</FieldLabel>
                <Input id="product-id" value={product.id} disabled />
              </Field>
            )}
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="product-name">Nombre</FieldLabel>
              <Input
                id="product-name"
                value={values.name}
                maxLength={160}
                onChange={(event) => setValue('name', event.target.value)}
                aria-invalid={Boolean(nameError)}
                disabled={isSaving}
                autoFocus
              />
              <FieldError>{nameError}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="product-short-name">Nombre corto</FieldLabel>
              <Input
                id="product-short-name"
                value={values.shortName}
                maxLength={80}
                onChange={(event) => setValue('shortName', event.target.value)}
                disabled={isSaving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="product-icon-url">URL del icono</FieldLabel>
              <Input
                id="product-icon-url"
                type="url"
                value={values.iconUrl}
                onChange={(event) => setValue('iconUrl', event.target.value)}
                disabled={isSaving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="product-description">Descripción</FieldLabel>
              <Textarea
                id="product-description"
                value={values.description}
                onChange={(event) => setValue('description', event.target.value)}
                disabled={isSaving}
              />
            </Field>
            {product && (
              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <p>Creado: {new Date(product.createdAt).toLocaleString()}</p>
                <p>Actualizado: {new Date(product.updatedAt).toLocaleString()}</p>
              </div>
            )}
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>

          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
