import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { getProduct } from '@/api/products.api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppLayout } from '@/layouts/app-layout';

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

  return currency === 'EUR' ? `${formattedAmount} €` : `${formattedAmount}${currency ? ` ${currency}` : ''}`;
}

export function ProductDetailPage() {
  const { id } = useParams();
  const productQuery = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id ?? ''),
    enabled: Boolean(id),
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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
    </AppLayout>
  );
}
