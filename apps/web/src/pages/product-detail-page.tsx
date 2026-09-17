import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImageOff, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { ProductOffer } from '@alitracker/shared';

import {
  deletePublicationProduct,
  reassignPublicationProduct,
} from '@/api/publication-products.api';
import { getProduct, getProductOptions } from '@/api/products.api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppLayout } from '@/layouts/app-layout';
import { ProductBestOfferHistoryDialog } from '@/features/product-best-offer-history/product-best-offer-history-dialog';
import { DeletePublicationProductDialog } from '@/features/publication-products/delete-publication-product-dialog';
import { EditPublicationProductDialog } from '@/features/publication-products/edit-publication-product-dialog';

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'long',
  timeStyle: 'short',
});

const wholeNumberFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

function formatDate(date: string) {
  return dateFormatter.format(new Date(date));
}

function formatOfferPrice(price: string | null, currency: string | null): string {
  if (price === null) {
    return '—';
  }

  const [whole, decimal] = price.split('.');
  const formattedAmount = `${wholeNumberFormatter.format(BigInt(whole ?? '0'))}${
    decimal ? `,${decimal.padEnd(2, '0')}` : ''
  }`;

  return currency === 'EUR'
    ? `${formattedAmount} €`
    : `${formattedAmount}${currency ? ` ${currency}` : ''}`;
}

export function ProductDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [selectedOffer, setSelectedOffer] = useState<ProductOffer | null>(null);
  const [activeAction, setActiveAction] = useState<'edit' | 'delete' | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | undefined>(id);
  const productQuery = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id ?? ''),
    enabled: Boolean(id),
  });
  const productOptionsQuery = useQuery({
    queryKey: ['product-options'],
    queryFn: getProductOptions,
    enabled: activeAction === 'edit' && selectedOffer !== null,
  });
  const refreshProduct = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['product', id] }),
      queryClient.invalidateQueries({ queryKey: ['product-best-offer-history', id] }),
    ]);
  };
  const deleteMutation = useMutation({
    mutationFn: () => deletePublicationProduct(selectedOffer?.id ?? ''),
    onSuccess: async () => {
      setSelectedOffer(null);
      setActiveAction(null);
      await refreshProduct();
    },
  });
  const editMutation = useMutation({
    mutationFn: () =>
      reassignPublicationProduct(selectedOffer?.id ?? '', { productId: editingProductId ?? '' }),
    onSuccess: async () => {
      setSelectedOffer(null);
      setActiveAction(null);
      await refreshProduct();
    },
  });

  return (
    <AppLayout>
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
        <ArrowLeft className="size-4" />
        Volver a productos
      </Link>

      {productQuery.isPending && (
        <p className="mt-8" role="status">
          Cargando producto…
        </p>
      )}

      {productQuery.isError && (
        <div className="mt-8" role="alert">
          <h1 className="text-3xl font-semibold text-slate-900">Producto no disponible</h1>
          <p className="mt-2 text-slate-600">
            No se pudo cargar el detalle del producto. Comprueba que la dirección sea correcta.
          </p>
        </div>
      )}

      {productQuery.data && (
        <article className="mt-8 max-w-3xl">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {productQuery.data.imageUrl ? (
              <img
                src={productQuery.data.imageUrl}
                alt={`Imagen de ${productQuery.data.name}`}
                className="size-32 shrink-0 rounded-md border object-cover"
              />
            ) : (
              <div
                className="flex size-32 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                aria-label={`Sin imagen para ${productQuery.data.name}`}
              >
                <ImageOff className="size-8" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{productQuery.data.name}</h1>
              <p className="mt-2 text-lg text-muted-foreground">
                {productQuery.data.shortName ?? 'Sin nombre corto'}
              </p>
            </div>
          </header>

          <section className="mt-10 border-t pt-6" aria-labelledby="product-description-title">
            <h2 id="product-description-title" className="text-lg font-medium">
              Descripción
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-slate-700">
              {productQuery.data.description ?? 'Sin descripción.'}
            </p>
          </section>

          <section className="mt-10 border-t pt-6" aria-labelledby="product-offers-title">
            <h2 id="product-offers-title" className="text-lg font-medium">
              Ofertas disponibles ({productQuery.data.offersCount})
            </h2>
            {productQuery.data.offers.length === 0 ? (
              <p className="mt-2 text-slate-700">No hay ofertas disponibles para este producto.</p>
            ) : (
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tienda</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Puntuación</TableHead>
                      <TableHead>Ventas</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Cantidad disponible</TableHead>
                      <TableHead>Máximo por compra</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productQuery.data.offers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>{offer.sellerName ?? '—'}</TableCell>
                        <TableCell>{offer.sellerLocation ?? '—'}</TableCell>
                        <TableCell>{offer.sellerReviewScore ?? '—'}</TableCell>
                        <TableCell>{offer.sellerSalesCount ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          {formatOfferPrice(offer.price, offer.currency)}
                        </TableCell>
                        <TableCell>{offer.quantityAvailable}</TableCell>
                        <TableCell>{offer.maxPurchase}</TableCell>
                        <TableCell>
                          <a
                            href={offer.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            Ver oferta
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Editar oferta ${offer.sellerName ?? offer.id}`}
                              onClick={() => {
                                setEditingProductId(productQuery.data.id);
                                setSelectedOffer(offer);
                                setActiveAction('edit');
                              }}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Eliminar oferta ${offer.sellerName ?? offer.id}`}
                              onClick={() => {
                                setSelectedOffer(offer);
                                setActiveAction('delete');
                              }}
                            >
                              <Trash2 className="text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className="mt-10 border-t pt-6" aria-labelledby="product-best-offer-title">
            <h2 id="product-best-offer-title" className="text-lg font-medium">
              Mejor oferta
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Evolución de la oferta disponible más barata entre todas las tiendas.
            </p>
            <ProductBestOfferHistoryDialog
              productId={productQuery.data.id}
              productName={productQuery.data.name}
              embedded
            />
          </section>

          <dl className="mt-8 grid gap-6 border-t pt-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-900">Fecha de actualización</dt>
              <dd className="mt-1 text-muted-foreground">
                {formatDate(productQuery.data.updatedAt)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Fecha de creación</dt>
              <dd className="mt-1 text-muted-foreground">
                {formatDate(productQuery.data.createdAt)}
              </dd>
            </div>
          </dl>
        </article>
      )}
      <DeletePublicationProductDialog
        open={activeAction === 'delete' && selectedOffer !== null}
        offerLabel={selectedOffer?.sellerName ?? selectedOffer?.id ?? ''}
        isDeleting={deleteMutation.isPending}
        error={deleteMutation.error instanceof Error ? deleteMutation.error.message : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOffer(null);
            setActiveAction(null);
          }
        }}
        onConfirm={() => deleteMutation.mutate()}
      />
      <EditPublicationProductDialog
        open={activeAction === 'edit' && selectedOffer !== null}
        productName={productQuery.data?.name ?? ''}
        currentProductId={editingProductId ?? id ?? ''}
        options={productOptionsQuery.data ?? []}
        optionsLoading={productOptionsQuery.isPending}
        isSaving={editMutation.isPending}
        error={editMutation.error instanceof Error ? editMutation.error.message : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOffer(null);
            setActiveAction(null);
            setEditingProductId(undefined);
          }
        }}
        onProductIdChange={setEditingProductId}
        onConfirm={() => editMutation.mutate()}
      />
    </AppLayout>
  );
}
