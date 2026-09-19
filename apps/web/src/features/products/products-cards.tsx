import type { Product } from '@alitracker/shared';
import { ImageOff, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type ProductsCardsProps = {
  products: Product[];
  onEdit: (product: Product) => void;
};

const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function ProductsCards({ products, onEdit }: ProductsCardsProps) {
  if (products.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay productos.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {products.map((product) => {
        const productLabel = product.shortName || product.name;

        return (
          <Card key={product.id} className="h-full">
            <Link to={`/products/${product.id}`} aria-label={`Ver detalle de ${productLabel}`}>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={`Imagen de ${productLabel}`}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div
                  className="flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground"
                  aria-label={`Sin imagen para ${productLabel}`}
                >
                  <ImageOff className="size-10" />
                </div>
              )}
            </Link>
            <CardHeader>
              <CardTitle className="line-clamp-2 text-lg">
                <Link to={`/products/${product.id}`} className="hover:underline">
                  {product.shortName}
                </Link>
              </CardTitle>
              <CardAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100"
                  onClick={() => onEdit(product)}
                  aria-label={`Editar ${productLabel}`}
                >
                  <Pencil />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {product.offersCount} {product.offersCount === 1 ? 'oferta' : 'ofertas'}
              </p>
            </CardContent>
            <CardFooter className="mt-auto justify-end">
              <span className="font-medium">
                {product.lowestAvailablePriceEuro === null
                  ? '—'
                  : euroFormatter.format(product.lowestAvailablePriceEuro)}
              </span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
