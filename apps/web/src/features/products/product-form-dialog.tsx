import { useEffect, useRef, useState } from 'react';

import {
  productImageContentTypeSchema,
  productImageMaxBytes,
  type Product,
  type ProductCreateInput,
} from '@alitracker/shared';
import { ImagePlus, Upload, X } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type ProductFormValues = {
  name: string;
  shortName: string;
  description: string;
};

const emptyValues: ProductFormValues = {
  name: '',
  shortName: '',
  description: '',
};

function toFormValues(product?: Product): ProductFormValues {
  if (!product) {
    return emptyValues;
  }

  return {
    name: product.name,
    shortName: product.shortName ?? '',
    description: product.description ?? '',
  };
}

export type ProductFormSubmission = {
  input: ProductCreateInput;
  imageFile?: File;
};

type ProductFormDialogProps = {
  open: boolean;
  product?: Product;
  isSaving: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: ProductFormSubmission) => void;
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
  const [imageError, setImageError] = useState<string>();
  const [imageFile, setImageFile] = useState<File>();
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>();
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValues(toFormValues(product));
      setNameError(undefined);
      setImageError(undefined);
      setImageFile(undefined);
    }
  }, [open, product]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(undefined);
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const setValue = (field: keyof ProductFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const selectImage = (file: File | undefined) => {
    if (!file || isSaving) {
      return;
    }

    if (!productImageContentTypeSchema.safeParse(file.type).success) {
      setImageError('Selecciona una imagen JPG, PNG, WebP o GIF.');
      return;
    }

    if (file.size > productImageMaxBytes) {
      setImageError('La imagen no puede superar los 5 MB.');
      return;
    }

    setImageError(undefined);
    setImageFile(file);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = values.name.trim();

    if (!name) {
      setNameError('El nombre es obligatorio.');
      return;
    }

    onSubmit({
      input: {
        name,
        shortName: values.shortName,
        description: values.description,
      },
      imageFile,
    });
  };

  const isEditing = Boolean(product);
  const title = isEditing ? 'Editar producto' : 'Agregar producto';
  const displayedImageUrl = imagePreviewUrl ?? product?.imageUrl;

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
              <FieldLabel htmlFor="product-image">Imagen</FieldLabel>
              <div
                className="rounded-xl outline-none focus:ring-2 focus:ring-ring/50"
                tabIndex={0}
                aria-label="Área para pegar o arrastrar la imagen del producto"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  selectImage(event.dataTransfer.files.item(0) ?? undefined);
                }}
                onPaste={(event) => {
                  const imageItem = Array.from(event.clipboardData.items).find(
                    (item) =>
                      item.kind === 'file' &&
                      productImageContentTypeSchema.safeParse(item.type).success,
                  );
                  const image = imageItem?.getAsFile();

                  if (image) {
                    event.preventDefault();
                    selectImage(image);
                  }
                }}
              >
                <input
                  ref={imageInputRef}
                  id="product-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={isSaving}
                  onChange={(event) => {
                    selectImage(event.target.files?.item(0) ?? undefined);
                    event.target.value = '';
                  }}
                />
                {displayedImageUrl ? (
                  <Attachment state={isSaving && imageFile ? 'uploading' : 'done'} className="w-full">
                    <AttachmentMedia variant="image">
                      <img src={displayedImageUrl} alt="Vista previa de la imagen del producto" />
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>
                        {imageFile?.name ?? product?.imageKey?.split('/').at(-1) ?? 'Imagen actual'}
                      </AttachmentTitle>
                      <AttachmentDescription>
                        {imageFile
                          ? `${Math.ceil(imageFile.size / 1024)} KB · lista para subir`
                          : 'Imagen actual'}
                      </AttachmentDescription>
                    </AttachmentContent>
                    {imageFile && (
                      <AttachmentActions>
                        <AttachmentAction
                          type="button"
                          aria-label="Quitar imagen seleccionada"
                          disabled={isSaving}
                          onClick={() => setImageFile(undefined)}
                        >
                          <X />
                        </AttachmentAction>
                      </AttachmentActions>
                    )}
                  </Attachment>
                ) : (
                  <Attachment state="idle" className="w-full">
                    <AttachmentMedia>
                      <ImagePlus />
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>Arrastra una imagen aquí</AttachmentTitle>
                      <AttachmentDescription>
                        Pega, arrastra o selecciona JPG, PNG, WebP o GIF · máximo 5 MB
                      </AttachmentDescription>
                    </AttachmentContent>
                  </Attachment>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => imageInputRef.current?.click()}
              >
                <Upload />
                {displayedImageUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}
              </Button>
              <FieldError>{imageError}</FieldError>
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
