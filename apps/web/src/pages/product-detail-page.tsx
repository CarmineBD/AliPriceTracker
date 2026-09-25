import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImageOff, PackageOpen, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { ProductOffer } from '@alitracker/shared';

import { getAveragePrices } from '@/api/average-prices.api';
import {
  deletePublicationProduct,
  reassignPublicationProduct,
} from '@/api/publication-products.api';
import {
  getProduct,
  getProductComponents,
  getProductOptions,
  deleteProduct,
  replaceProductComponents,
  updateProduct,
  uploadProductImage,
} from '@/api/products.api';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { DeleteProductDialog } from '@/features/products/delete-product-dialog';
import {
  ProductFormDialog,
  type ProductFormSubmission,
} from '@/features/products/product-form-dialog';

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'long',
  timeStyle: 'short',
});

const wholeNumberFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percentageFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 2,
});

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

function priceInCents(price: string): bigint {
  const [whole, decimal = ''] = price.split('.');
  return BigInt(whole ?? '0') * 100n + BigInt(decimal.padEnd(2, '0'));
}

function sortOffersByPrice(offers: ProductOffer[]): ProductOffer[] {
  return [...offers].sort((first, second) => {
    if (first.price === null) return second.price === null ? 0 : 1;
    if (second.price === null) return -1;

    const difference = priceInCents(first.price) - priceInCents(second.price);
    return difference < 0n ? -1 : difference > 0n ? 1 : 0;
  });
}

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOffer, setSelectedOffer] = useState<ProductOffer | null>(null);
  const [activeAction, setActiveAction] = useState<'edit' | 'delete' | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | undefined>(id);
  const [isProductEditOpen, setIsProductEditOpen] = useState(false);
  const [isProductDeleteOpen, setIsProductDeleteOpen] = useState(false);
  const productQuery = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id ?? ''),
    enabled: Boolean(id),
  });
  const averagePricesQuery = useQuery({
    queryKey: ['average-prices'],
    queryFn: getAveragePrices,
    enabled: Boolean(id),
  });
  const productOptionsQuery = useQuery({
    queryKey: ['product-options'],
    queryFn: getProductOptions,
    enabled: isProductEditOpen || (activeAction === 'edit' && selectedOffer !== null),
  });
  const productComponentsQuery = useQuery({
    queryKey: ['product-components', id],
    queryFn: () => getProductComponents(id ?? ''),
    enabled: Boolean(id),
  });
  const refreshProduct = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['product', id] }),
      queryClient.invalidateQueries({ queryKey: ['product-components', id] }),
      queryClient.invalidateQueries({ queryKey: ['product-best-offer-history', id] }),
      queryClient.invalidateQueries({ queryKey: ['average-prices'] }),
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
  const updateProductMutation = useMutation({
    mutationFn: async ({ input, imageFile, components }: ProductFormSubmission) => {
      const product = productQuery.data;
      if (!product) throw new Error('Product not found.');

      await replaceProductComponents(product.id, components);
      await updateProduct(product.id, input);
      if (imageFile) await uploadProductImage(product.id, imageFile);
    },
    onSuccess: async () => {
      setIsProductEditOpen(false);
      await refreshProduct();
    },
  });
  const deleteProductMutation = useMutation({
    mutationFn: () => deleteProduct(productQuery.data?.id ?? ''),
    onSuccess: () => {
      setIsProductDeleteOpen(false);
      setIsProductEditOpen(false);
      navigate('/');
    },
  });
  const sortedOffers = productQuery.data ? sortOffersByPrice(productQuery.data.offers) : [];
  const averagePurchasePrice = averagePricesQuery.data?.purchases.find(
    (price) => price.productId === productQuery.data?.id,
  )?.averagePrice;
  const averageSellingPrice = averagePricesQuery.data?.sales.find(
    (price) => price.productId === productQuery.data?.id,
  )?.averagePrice;
  const averageRoi =
    averagePurchasePrice !== undefined &&
    averagePurchasePrice > 0 &&
    averageSellingPrice !== undefined
      ? ((averageSellingPrice - averagePurchasePrice) / averagePurchasePrice) * 100
      : null;

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
        <article className="mt-8 w-full">
          <header className="relative flex flex-col gap-6 pr-12 sm:flex-row sm:items-start">
            {productQuery.data.imageUrl ? (
              <img
                src={productQuery.data.imageUrl}
                alt={`Imagen de ${productQuery.data.name}`}
                className="size-40 shrink-0 rounded-md border object-cover"
              />
            ) : (
              <div
                className="flex size-40 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                aria-label={`Sin imagen para ${productQuery.data.name}`}
              >
                <ImageOff className="size-8" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold text-slate-900">{productQuery.data.name}</h1>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {productQuery.data.description ?? 'Sin descripción.'}
              </p>
              <div className="mt-6">
                <p className="text-sm font-medium text-muted-foreground">
                  Precio más bajo disponible
                </p>
                <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-900">
                  {productQuery.data.lowestAvailablePriceEuro === null
                    ? '—'
                    : euroFormatter.format(productQuery.data.lowestAvailablePriceEuro)}
                </p>
              </div>
              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Precio medio de compra
                  </dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {averagePurchasePrice === undefined
                      ? '—'
                      : euroFormatter.format(averagePurchasePrice)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Precio medio de venta
                  </dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {averageSellingPrice === undefined
                      ? '—'
                      : euroFormatter.format(averageSellingPrice)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">ROI medio</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {averageRoi === null ? '—' : `${percentageFormatter.format(averageRoi)}%`}
                  </dd>
                </div>
              </dl>
            </div>
            <Button
              type="button"
              className="absolute top-0 right-0 cursor-pointer bg-black text-white hover:bg-black/90"
              onClick={() => setIsProductEditOpen(true)}
            >
              <Pencil />
              Editar
            </Button>
          </header>

          {productComponentsQuery.data?.length ? (
            <section className="mt-10 border-t pt-6" aria-labelledby="product-components-title">
              <h2 id="product-components-title" className="text-lg font-medium">
                Productos que contiene ({productComponentsQuery.data.length})
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {productComponentsQuery.data.map((component) => (
                  <Card key={component.containsProductId} size="sm" className="w-24 gap-2">
                    {component.product.imageUrl ? (
                      <img
                        src={component.product.imageUrl}
                        alt={`Imagen de ${component.product.shortName}`}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground"
                        aria-label={`Sin imagen para ${component.product.shortName}`}
                      >
                        <ImageOff className="size-5" />
                      </div>
                    )}
                    <CardHeader className="px-3">
                      <CardTitle className="truncate text-xs" title={component.product.shortName}>
                        {component.product.shortName}
                      </CardTitle>
                    </CardHeader>
                    <CardFooter className="mt-auto justify-end px-3 py-2 text-xs text-muted-foreground">
                      x{component.quantity}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-10 border-t pt-6" aria-labelledby="product-offers-title">
            <h2 id="product-offers-title" className="text-lg font-medium">
              Ofertas disponibles ({productQuery.data.offersCount})
            </h2>
            {productQuery.data.offers.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={PackageOpen}
                  title="No hay ofertas disponibles para este producto"
                  description="Las ofertas asociadas a este producto aparecerán aquí."
                />
              </div>
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
                    {sortedOffers.map((offer) => (
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
      <ProductFormDialog
        open={isProductEditOpen}
        product={productQuery.data}
        components={productComponentsQuery.data}
        componentsLoading={productComponentsQuery.isPending}
        productOptions={productOptionsQuery.data}
        productOptionsLoading={productOptionsQuery.isPending}
        isSaving={updateProductMutation.isPending}
        error={
          updateProductMutation.error instanceof Error
            ? updateProductMutation.error.message
            : undefined
        }
        onOpenChange={(open) => {
          if (!open && !updateProductMutation.isPending) setIsProductEditOpen(false);
        }}
        onSubmit={(submission) => updateProductMutation.mutate(submission)}
        onDelete={() => {
          deleteProductMutation.reset();
          setIsProductDeleteOpen(true);
        }}
      />
      <DeleteProductDialog
        product={isProductDeleteOpen ? productQuery.data : undefined}
        isDeleting={deleteProductMutation.isPending}
        error={
          deleteProductMutation.error instanceof Error
            ? deleteProductMutation.error.message
            : undefined
        }
        onOpenChange={(open) => {
          if (!open && !deleteProductMutation.isPending) setIsProductDeleteOpen(false);
        }}
        onConfirm={() => deleteProductMutation.mutate()}
      />
    </AppLayout>
  );
}
