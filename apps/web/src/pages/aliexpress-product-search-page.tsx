import { useState, type FormEvent } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import { getAliExpressProduct } from '@/api/aliexpress-products.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AliExpressProductsTable } from '@/features/aliexpress-products/aliexpress-products-table';
import { AppLayout } from '@/layouts/app-layout';

const productIdPattern = /^\d+$/;

export function AliExpressProductSearchPage() {
  const [inputValue, setInputValue] = useState('');
  const [productId, setProductId] = useState<string>();
  const [inputError, setInputError] = useState<string>();
  const [searchNumber, setSearchNumber] = useState(0);
  const productQuery = useQuery({
    queryKey: ['aliexpress-product', productId, searchNumber],
    queryFn: () => getAliExpressProduct(productId ?? ''),
    enabled: Boolean(productId),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = inputValue.trim();

    if (!productIdPattern.test(id)) {
      setInputError('Introduce un ID de publicación numérico.');
      return;
    }

    setInputError(undefined);
    setProductId(id);
    setSearchNumber((current) => current + 1);
  }

  return (
    <AppLayout>
      <div className="max-w-4xl">
        <h1 className="text-3xl font-semibold text-slate-900">Buscar en AliExpress</h1>
        <p className="mt-2 text-slate-600">
          Consulta una publicación por su ID y revisa las variantes disponibles.
        </p>

        <form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit} noValidate>
          <div className="flex-1">
            <label htmlFor="aliexpress-product-id" className="sr-only">
              ID de publicación de AliExpress
            </label>
            <Input
              id="aliexpress-product-id"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ej.: 1005010519851506"
              inputMode="numeric"
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
      </div>

      {productQuery.isError && (
        <p className="mt-8 text-destructive" role="alert">
          No se pudo consultar la publicación. Inténtalo de nuevo más tarde.
        </p>
      )}

      {productQuery.data && (
        <section className="mt-10" aria-labelledby="aliexpress-results-title">
          <h2 id="aliexpress-results-title" className="text-xl font-medium">
            {productQuery.data.productName ?? `Publicación ${productQuery.data.productId}`}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {productQuery.data.products.length} variantes encontradas
          </p>
          <div className="mt-4">
            <AliExpressProductsTable products={productQuery.data.products} />
          </div>
        </section>
      )}
    </AppLayout>
  );
}
