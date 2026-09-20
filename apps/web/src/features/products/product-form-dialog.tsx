import { useEffect, useRef, useState } from 'react';

import {
  productImageContentTypeSchema,
  productImageMaxBytes,
  type Product,
  type ProductCombo,
  type ProductCreateInput,
  type ProductOption,
} from '@alitracker/shared';
import { Copy, ImagePlus, Upload, X } from 'lucide-react';

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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProductComponentsEditor } from './product-components-editor';

type ProductFormValues = {
  name: string;
  shortName: string;
  description: string;
  averageSellingPrice: string;
};

const emptyValues: ProductFormValues = {
  name: '',
  shortName: '',
  description: '',
  averageSellingPrice: '',
};

const emptyComponents: ProductCombo[] = [];

function toFormValues(product?: Product): ProductFormValues {
  if (!product) {
    return emptyValues;
  }

  return {
    name: product.name,
    shortName: product.shortName ?? '',
    description: product.description ?? '',
    averageSellingPrice: product.averageSellingPrice?.toString() ?? '',
  };
}

export type ProductFormSubmission = {
  input: ProductCreateInput;
  imageFile?: File;
  components: ProductCombo[];
};

type ProductFormDialogProps = {
  open: boolean;
  product?: Product;
  isSaving: boolean;
  components?: ProductCombo[];
  productOptions?: ProductOption[];
  productOptionsLoading?: boolean;
  componentsLoading?: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: ProductFormSubmission) => void;
  onDelete?: () => void;
};

export function ProductFormDialog({
  open,
  product,
  isSaving,
  components = emptyComponents,
  productOptions = [],
  productOptionsLoading = false,
  componentsLoading = false,
  error,
  onOpenChange,
  onSubmit,
  onDelete,
}: ProductFormDialogProps) {
  const [values, setValues] = useState<ProductFormValues>(() => toFormValues(product));
  const [nameError, setNameError] = useState<string>();
  const [shortNameError, setShortNameError] = useState<string>();
  const [averageSellingPriceError, setAverageSellingPriceError] = useState<string>();
  const [imageError, setImageError] = useState<string>();
  const [imageFile, setImageFile] = useState<File>();
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>();
  const [containedProducts, setContainedProducts] = useState<ProductCombo[]>(components);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValues(toFormValues(product));
      setNameError(undefined);
      setShortNameError(undefined);
      setAverageSellingPriceError(undefined);
      setImageError(undefined);
      setImageFile(undefined);
      setContainedProducts(components);
    }
  }, [components, open, product]);

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

    const shortName = values.shortName.trim();
    if (!shortName) {
      setShortNameError('El nombre corto es obligatorio.');
      return;
    }

    const averageSellingPrice = values.averageSellingPrice.trim();
    const parsedAverageSellingPrice =
      averageSellingPrice === '' ? null : Number(averageSellingPrice);
    if (
      parsedAverageSellingPrice !== null &&
      (!Number.isFinite(parsedAverageSellingPrice) ||
        parsedAverageSellingPrice < 0 ||
        parsedAverageSellingPrice > 9_999_999_999.99 ||
        !/^\d+(\.\d{1,2})?$/.test(averageSellingPrice))
    ) {
      setAverageSellingPriceError('Introduce un importe válido con como máximo dos decimales.');
      return;
    }
    setAverageSellingPriceError(undefined);

    onSubmit({
      input: {
        name,
        shortName,
        description: values.description,
        averageSellingPrice: containedProducts.length > 0 ? null : parsedAverageSellingPrice,
      },
      imageFile,
      components: containedProducts,
    });
  };

  const isEditing = Boolean(product);
  const title = isEditing ? 'Edición de producto' : 'Alta de producto';
  const displayedImageUrl = imagePreviewUrl ?? product?.imageUrl;

  const copyProductId = () => {
    if (!product || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(product.id).catch(() => undefined);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isSaving) {
          return;
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form noValidate onSubmit={submit} className="relative">
          <DialogClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-0 right-0"
                aria-label="Cerrar ventana"
                disabled={isSaving}
              />
            }
          >
            <X />
          </DialogClose>
          <DialogHeader className="pr-9">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <FieldSet disabled={isSaving || componentsLoading} className="mt-6">
            <FieldLegend className="sr-only">Datos del producto</FieldLegend>
            <FieldGroup className="gap-4">
              <Field data-invalid={Boolean(imageError)}>
                <FieldLabel htmlFor="product-image">Imagen</FieldLabel>
                <FieldContent>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <div
                      className="min-w-0 flex-1 rounded-xl outline-none focus:ring-2 focus:ring-ring/50"
                      tabIndex={isSaving ? -1 : 0}
                      aria-label="Área para pegar o arrastrar la imagen del producto"
                      aria-describedby="product-image-description product-image-error"
                      aria-disabled={isSaving}
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
                        onChange={(event) => {
                          selectImage(event.target.files?.item(0) ?? undefined);
                          event.target.value = '';
                        }}
                      />
                      {displayedImageUrl ? (
                        <Attachment
                          state={isSaving && imageFile ? 'uploading' : 'done'}
                          className="w-full"
                        >
                          <AttachmentMedia variant="image" className="size-28 sm:size-32">
                            <img
                              src={displayedImageUrl}
                              alt="Vista previa de la imagen del producto"
                            />
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>
                              {imageFile?.name ??
                                product?.imageKey?.split('/').at(-1) ??
                                'Imagen del producto'}
                            </AttachmentTitle>
                            <AttachmentDescription>
                              {imageFile ? (
                                `${Math.ceil(imageFile.size / 1024)} KB · lista para subir`
                              ) : (
                                <span className="text-muted-foreground">
                                  Pega, arrastra una imagen para reemplazar
                                </span>
                              )}
                            </AttachmentDescription>
                            <AttachmentDescription id="product-image-description">
                              JPG, PNG, WebP o GIF; tamaño máximo de 5 MB.
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
                          <AttachmentMedia className="size-28 sm:size-32">
                            <ImagePlus />
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>Pega, arrastra una imagen aquí</AttachmentTitle>
                            <AttachmentDescription id="product-image-description">
                              JPG, PNG, WebP o GIF; tamaño máximo de 5 MB.
                            </AttachmentDescription>
                          </AttachmentContent>
                        </Attachment>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:h-auto sm:w-32 sm:self-stretch sm:flex-col sm:gap-2 sm:p-2"
                      aria-label={displayedImageUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}
                      disabled={isSaving}
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Upload className="size-5" />
                      <span>Subir imagen</span>
                    </Button>
                  </div>
                  <FieldError id="product-image-error">{imageError}</FieldError>
                </FieldContent>
              </Field>
              <Field data-invalid={Boolean(nameError)}>
                <FieldLabel htmlFor="product-name">Nombre</FieldLabel>
                <FieldContent>
                  <Input
                    id="product-name"
                    value={values.name}
                    maxLength={160}
                    required
                    onChange={(event) => {
                      setValue('name', event.target.value);
                      if (nameError) setNameError(undefined);
                    }}
                    aria-invalid={Boolean(nameError)}
                    aria-describedby={nameError ? 'product-name-error' : undefined}
                    autoFocus
                  />
                  <FieldError id="product-name-error">{nameError}</FieldError>
                </FieldContent>
              </Field>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-start">
                <Field data-invalid={Boolean(shortNameError)}>
                  <FieldLabel htmlFor="product-short-name">Nombre corto</FieldLabel>
                  <FieldContent>
                    <Input
                      id="product-short-name"
                      value={values.shortName}
                      maxLength={80}
                      required
                      onChange={(event) => {
                        setValue('shortName', event.target.value);
                        if (shortNameError) setShortNameError(undefined);
                      }}
                      aria-invalid={Boolean(shortNameError)}
                      aria-describedby={shortNameError ? 'product-short-name-error' : undefined}
                    />
                    <FieldError id="product-short-name-error">{shortNameError}</FieldError>
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(averageSellingPriceError)}>
                  <FieldLabel htmlFor="product-average-selling-price">
                    Precio medio de venta (€)
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="product-average-selling-price"
                      type="number"
                      min="0"
                      max="9999999999.99"
                      step="0.01"
                      inputMode="decimal"
                      value={values.averageSellingPrice}
                      disabled={containedProducts.length > 0}
                      onChange={(event) => {
                        setValue('averageSellingPrice', event.target.value);
                        if (averageSellingPriceError) setAverageSellingPriceError(undefined);
                      }}
                      aria-invalid={Boolean(averageSellingPriceError)}
                      aria-describedby={
                        averageSellingPriceError ? 'product-average-selling-price-error' : undefined
                      }
                    />
                    <FieldError id="product-average-selling-price-error">
                      {averageSellingPriceError}
                    </FieldError>
                    {containedProducts.length > 0 && (
                      <FieldDescription>
                        El precio de un combo se calcula automáticamente a partir de sus
                        componentes.
                      </FieldDescription>
                    )}
                  </FieldContent>
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="product-description">Descripción</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="product-description"
                      value={values.description}
                      onChange={(event) => setValue('description', event.target.value)}
                    />
                  </FieldContent>
                </Field>
              </div>
              <ProductComponentsEditor
                productId={product?.id}
                components={containedProducts}
                options={productOptions}
                optionsLoading={productOptionsLoading}
                disabled={isSaving}
                onChange={setContainedProducts}
              />
            </FieldGroup>
          </FieldSet>

          {product && (
            <>
              <dl className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt>Creado</dt>
                  <dd>{new Date(product.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Actualizado</dt>
                  <dd>{new Date(product.updatedAt).toLocaleString()}</dd>
                </div>
              </dl>
              <div className="mt-3 text-xs text-muted-foreground">
                <p>ID de producto</p>
                <div className="mt-1 flex items-center gap-1">
                  <span className="break-all">{product.id}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Copiar ID de producto"
                    onClick={copyProductId}
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
            </>
          )}
          {error && <FieldError className="mt-6">{error}</FieldError>}

          <DialogFooter className="mt-6 sm:justify-between">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                disabled={isSaving || componentsLoading}
                onClick={onDelete}
              >
                Eliminar producto
              </Button>
            )}
            <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
              <DialogClose render={<Button type="button" variant="outline" disabled={isSaving} />}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={isSaving || componentsLoading}>
                {isSaving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
