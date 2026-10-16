import { ImageOff } from 'lucide-react';
import { Link, useInRouterContext } from 'react-router-dom';

type ProductImageLinkProps = {
  productId?: string;
  productName: string;
  imageUrl: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const sizeClasses = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
  xl: 'size-16',
} as const;

export function ProductImageLink({
  productId,
  productName,
  imageUrl,
  size = 'md',
}: ProductImageLinkProps) {
  const isWithinRouter = useInRouterContext();
  const image = imageUrl ? (
    <img
      src={imageUrl}
      alt={`Imagen de ${productName}`}
      className={`${sizeClasses[size]} shrink-0 rounded-md border object-cover`}
    />
  ) : (
    <span
      className={`flex ${sizeClasses[size]} shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground`}
      aria-label={`Sin imagen para ${productName}`}
    >
      <ImageOff className="size-4" />
    </span>
  );

  if (!productId || !isWithinRouter) return image;

  return (
    <Link
      to={`/products/${productId}`}
      aria-label={`Ver detalles de ${productName}`}
      className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {image}
    </Link>
  );
}
