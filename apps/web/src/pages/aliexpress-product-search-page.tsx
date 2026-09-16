import { useEffect, useState, type FormEvent } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import {
  buildImportAliExpressPublicationPayload,
  importAliExpressPublication,
} from '@/api/aliexpress-publications.api';
import { getAliExpressProduct } from '@/api/aliexpress-products.api';
import { ApiError } from '@/api/client';
import { getProductOptions } from '@/api/products.api';
import { AliExpressPublicationInfo } from '@/features/aliexpress-products/aliexpress-publication-info';
import type { SkuProductAssociations } from '@/features/aliexpress-products/aliexpress-import.types';
import { AliExpressProductsTable } from '@/features/aliexpress-products/aliexpress-products-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { AppLayout } from '@/layouts/app-layout';

const productIdPattern = /^\d+$/;
const aliExpressProductUrlPattern = /\/item\/(\d+)\.html$/;

type DialogContent = {
  title: string;
  description: string;
};

function getErrorDescription(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  const missingProductIds = error.details?.missingProductIds;
  if (Array.isArray(missingProductIds) && missingProductIds.every((id) => typeof id === 'string')) {
    return `${error.message}\n\nProductos no encontrados: ${missingProductIds.join(', ')}`;
  }

  return error.message;
}

function getAliExpressProductId(value: string): string | undefined {
  const trimmedValue = value.trim();
  if (productIdPattern.test(trimmedValue)) {
    return trimmedValue;
  }

  try {
    return new URL(trimmedValue).pathname.match(aliExpressProductUrlPattern)?.[1];
  } catch {
    return undefined;
  }
}

export function AliExpressProductSearchPage() {
  const [inputValue, setInputValue] = useState('');
  const [productId, setProductId] = useState<string>();
  const [inputError, setInputError] = useState<string>();
  const [searchNumber, setSearchNumber] = useState(0);
  const [associations, setAssociations] = useState<SkuProductAssociations>({});
  const [dialog, setDialog] = useState<DialogContent | null>(null);

  const productQuery = useQuery({
    queryKey: ['aliexpress-product', productId, searchNumber],
    queryFn: () => getAliExpressProduct(productId ?? ''),
    enabled: Boolean(productId),
  });
  const productOptionsQuery = useQuery({
    queryKey: ['product-options'],
    queryFn: getProductOptions,
  });
  const importMutation = useMutation({
    mutationFn: importAliExpressPublication,
    onSuccess: () => {
      toast({
        title: 'Publicación añadida',
        description: 'La publicación se ha añadido correctamente al sistema.',
      });
      setInputValue('');
      setProductId(undefined);
      setAssociations({});
      setInputError(undefined);
    },
    onError: (error) => {
      setDialog({
        title: 'No se pudo añadir la publicación',
        description: getErrorDescription(error, 'No fue posible guardar la publicación.'),
      });
    },
  });

  useEffect(() => {
    if (productQuery.error) {
      setDialog({
        title: 'No se pudo consultar la publicación',
        description: getErrorDescription(
          productQuery.error,
          'No fue posible consultar AliExpress. Inténtalo de nuevo más tarde.',
        ),
      });
    }
  }, [productQuery.error]);

  useEffect(() => {
    if (productOptionsQuery.error) {
      setDialog({
        title: 'No se pudieron cargar los productos',
        description: getErrorDescription(
          productOptionsQuery.error,
          'No fue posible cargar los productos internos disponibles.',
        ),
      });
    }
  }, [productOptionsQuery.error]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = getAliExpressProductId(inputValue);

    if (!id) {
      setInputError('Introduce un ID numérico o una URL válida de una publicación de AliExpress.');
      return;
    }

    setInputError(undefined);
    setAssociations({});
    setProductId(id);
    setSearchNumber((current) => current + 1);
  }

  function handleAssociationChange(aliexpressSkuId: string, internalProductId: string | undefined) {
    setAssociations((current) => ({ ...current, [aliexpressSkuId]: internalProductId }));
  }

  function handleImport() {
    if (!productQuery.data) {
      return;
    }

    try {
      importMutation.mutate(
        buildImportAliExpressPublicationPayload(productQuery.data, associations),
      );
    } catch (error) {
      setDialog({
        title: 'No se pudo añadir la publicación',
        description: error instanceof Error ? error.message : 'No fue posible preparar la importación.',
      });
    }
  }

  const preview = productQuery.data;
  const allVariantsAssociated =
    preview !== undefined &&
    preview.products.length > 0 &&
    preview.products.every((product) => Boolean(associations[product.aliexpressSkuId]));

  return (
    <AppLayout>
      <div className="max-w-6xl">
        <h1 className="text-3xl font-semibold text-slate-900">AliExpress</h1>
        <p className="mt-2 text-slate-600">
          Busca una publicación, asocia sus variantes a productos internos y añádela al sistema.
        </p>

        <form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch} noValidate>
          <div className="flex-1">
            <label htmlFor="aliexpress-product-id" className="sr-only">
              ID o URL de publicación AliExpress
            </label>
            <Input
              id="aliexpress-product-id"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ej.: 1005012470064491 o https://es.aliexpress.com/item/1005012470064491.html"
              aria-invalid={Boolean(inputError)}
              aria-describedby={inputError ? 'aliexpress-product-id-error' : undefined}
            />
            {inputError && (
              <p
                id="aliexpress-product-id-error"
                className="mt-2 text-sm text-destructive"
                role="alert"
              >
                {inputError}
              </p>
            )}
          </div>
          <Button type="submit" disabled={productQuery.isFetching}>
            <Search />
            {productQuery.isFetching ? 'Buscando…' : 'Buscar'}
          </Button>
        </form>

        {preview && (
          <section className="mt-10" aria-labelledby="aliexpress-results-title">
            <h2 id="aliexpress-results-title" className="text-xl font-medium">
              Vista previa de la publicación
            </h2>
            <div className="mt-4">
              <AliExpressPublicationInfo store={preview.store} publication={preview.publication} />
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-medium">Variantes ({preview.products.length})</h3>
              {productOptionsQuery.isLoading ? (
                <p className="mt-4 text-sm text-muted-foreground">Cargando productos internos…</p>
              ) : (
                <div className="mt-4">
                  <AliExpressProductsTable
                    products={preview.products}
                    productOptions={productOptionsQuery.data ?? []}
                    associations={associations}
                    showValidation={false}
                    onAssociationChange={handleAssociationChange}
                  />
                </div>
              )}
            </div>

            {!allVariantsAssociated && preview.products.length > 0 && !productOptionsQuery.isLoading && (
              <p className="mt-4 text-sm text-muted-foreground">
                Debes asociar un producto a todas las variantes antes de continuar.
              </p>
            )}
            <Button
              className="mt-6"
              onClick={handleImport}
              disabled={!allVariantsAssociated || importMutation.isPending || productOptionsQuery.isLoading}
            >
              {importMutation.isPending ? 'Añadiendo…' : 'Añadir al sistema'}
            </Button>
          </section>
        )}
      </div>

      <AlertDialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog?.title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {dialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDialog(null)}>Aceptar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
