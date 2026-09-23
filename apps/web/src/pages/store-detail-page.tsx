import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, PackageOpen } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { getStore } from '@/api/stores.api';
import { EmptyState } from '@/components/empty-state';
import { PublicationProductHistoryDialog } from '@/features/publication-product-history/publication-product-history-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppLayout } from '@/layouts/app-layout';

function displayValue(value: string | number | null) {
  return value ?? '—';
}

function formatPrice(price: string | null, currency: string | null) {
  if (price === null) {
    return '—';
  }

  return currency ? `${price} ${currency}` : price;
}

export function StoreDetailPage() {
  const { id } = useParams();
  const storeQuery = useQuery({
    queryKey: ['store', id],
    queryFn: () => getStore(id ?? ''),
    enabled: Boolean(id),
  });

  return (
    <AppLayout>
      <Link
        to="/stores"
        className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
      >
        <ArrowLeft className="size-4" />
        Volver a tiendas
      </Link>

      {storeQuery.isPending && (
        <p className="mt-8" role="status">
          Cargando tienda…
        </p>
      )}

      {storeQuery.isError && (
        <div className="mt-8" role="alert">
          <h1 className="text-3xl font-semibold text-slate-900">Tienda no disponible</h1>
          <p className="mt-2 text-slate-600">
            No se pudo cargar el detalle de la tienda. Comprueba que la dirección sea correcta.
          </p>
        </div>
      )}

      {storeQuery.data && (
        <article className="mt-8">
          <header>
            <h1 className="text-3xl font-semibold text-slate-900">
              {displayValue(storeQuery.data.name)}
            </h1>
            <dl className="mt-6 grid gap-4 rounded-lg border bg-card p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="font-medium text-foreground">Localización</dt>
                <dd className="mt-1 text-muted-foreground">
                  {displayValue(storeQuery.data.location)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Puntuación</dt>
                <dd className="mt-1 text-muted-foreground">
                  {displayValue(storeQuery.data.reviewScore)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Ventas últimos 6 meses</dt>
                <dd className="mt-1 text-muted-foreground">
                  {displayValue(storeQuery.data.sales180d)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Publicaciones</dt>
                <dd className="mt-1 text-muted-foreground">{storeQuery.data.publicationsCount}</dd>
              </div>
            </dl>
          </header>

          <section className="mt-10" aria-labelledby="store-publications-title">
            <h2 id="store-publications-title" className="text-xl font-medium">
              Publicaciones ({storeQuery.data.publicationsCount})
            </h2>

            {storeQuery.data.publications.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={PackageOpen}
                  title="Esta tienda aún no tiene publicaciones"
                  description="Las publicaciones importadas de esta tienda aparecerán aquí."
                />
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {storeQuery.data.publications.map((publication) => (
                  <article key={publication.id} className="rounded-lg border bg-card p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-medium">
                          {publication.name ?? publication.aliexpressProductId}
                        </h3>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {publication.aliexpressProductId}
                        </p>
                      </div>
                      {publication.url && (
                        <a
                          href={publication.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Ver en AliExpress
                        </a>
                      )}
                    </div>

                    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="font-medium text-foreground">Ventas</dt>
                        <dd className="mt-1 text-muted-foreground">
                          {displayValue(publication.salesCount)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Puntuación</dt>
                        <dd className="mt-1 text-muted-foreground">
                          {displayValue(publication.reviewScore)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Reseñas</dt>
                        <dd className="mt-1 text-muted-foreground">
                          {displayValue(publication.reviewCount)}
                        </dd>
                      </div>
                    </dl>

                    <section
                      className="mt-6"
                      aria-labelledby={`publication-products-${publication.id}`}
                    >
                      <h4
                        id={`publication-products-${publication.id}`}
                        className="text-base font-medium"
                      >
                        Productos disponibles ({publication.products.length})
                      </h4>
                      {publication.products.length === 0 ? (
                        <div className="mt-3">
                          <EmptyState
                            icon={PackageOpen}
                            title="Esta publicación no tiene productos asociados"
                            description="No hay variantes vinculadas a productos internos."
                          />
                        </div>
                      ) : (
                        <div className="mt-3 overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>SKU AliExpress</TableHead>
                                <TableHead className="text-right">Precio</TableHead>
                                <TableHead>Disponible</TableHead>
                                <TableHead>Máximo por compra</TableHead>
                                <TableHead>Histórico</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {publication.products.map((product) => (
                                <TableRow key={product.id}>
                                  <TableCell>
                                    <p className="font-medium">{product.productShortName}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {product.productName}
                                    </p>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {product.aliexpressSkuId}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatPrice(product.price, product.currency)}
                                  </TableCell>
                                  <TableCell>{displayValue(product.quantityAvailable)}</TableCell>
                                  <TableCell>{displayValue(product.maxPurchase)}</TableCell>
                                  <TableCell>
                                    <PublicationProductHistoryDialog
                                      publicationProductId={product.id}
                                      productName={product.productShortName}
                                      aliexpressSkuId={product.aliexpressSkuId}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </section>
                  </article>
                ))}
              </div>
            )}
          </section>
        </article>
      )}
    </AppLayout>
  );
}
