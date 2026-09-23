import type { PublicationProductChange } from '@alitracker/shared';
import { ArrowDown, ArrowUp, ExternalLink, History, ImageOff } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';

import { formatRelativeExecutionTime } from './publication-product-changes.utils';

type PublicationProductChangesTableProps = {
  changes: PublicationProductChange[];
  now: Date;
};

const amountFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPrice(value: string | null, currency: string | null): string {
  if (value === null) return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return currency ? `${value} ${currency}` : value;
  if (!currency) return amountFormatter.format(amount);

  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amountFormatter.format(amount)} ${currency}`;
  }
}

type ChangeDirection = 'positive' | 'negative' | 'neutral';

type FormattedChange = {
  currentValue: string;
  difference: string | null;
  direction: ChangeDirection;
};

function formatNumericDifference(
  previousValue: number | null,
  currentValue: number | null,
): FormattedChange {
  if (currentValue === null) {
    return { currentValue: '—', difference: null, direction: 'neutral' };
  }
  if (previousValue === null) {
    return { currentValue: String(currentValue), difference: null, direction: 'neutral' };
  }

  const difference = currentValue - previousValue;
  return {
    currentValue: String(currentValue),
    difference: `${difference > 0 ? '+' : ''}${difference}`,
    direction: difference > 0 ? 'positive' : difference < 0 ? 'negative' : 'neutral',
  };
}

function formatPriceDifference(
  previousValue: string | null,
  currentValue: string | null,
  currency: string | null,
): FormattedChange {
  if (currentValue === null) {
    return { currentValue: '—', difference: null, direction: 'neutral' };
  }
  if (previousValue === null) {
    return {
      currentValue: formatPrice(currentValue, currency),
      difference: null,
      direction: 'neutral',
    };
  }

  const difference = Math.round((Number(currentValue) - Number(previousValue)) * 100) / 100;
  if (!Number.isFinite(difference)) {
    return {
      currentValue: formatPrice(currentValue, currency),
      difference: null,
      direction: 'neutral',
    };
  }

  return {
    currentValue: formatPrice(currentValue, currency),
    difference: `${difference > 0 ? '+' : difference < 0 ? '-' : ''}${formatPrice(Math.abs(difference).toFixed(2), currency)}`,
    direction: difference > 0 ? 'positive' : difference < 0 ? 'negative' : 'neutral',
  };
}

function formatChange(change: PublicationProductChange): FormattedChange {
  if (change.changeType === 'price') {
    return formatPriceDifference(change.previousValue, change.currentValue, change.currentCurrency);
  }

  return formatNumericDifference(change.previousValue, change.currentValue);
}

function changeDirectionClass(direction: ChangeDirection): string {
  if (direction === 'positive') return 'text-destructive';
  if (direction === 'negative') return 'text-emerald-700';
  return 'text-muted-foreground';
}

export function PublicationProductChangesTable({
  changes,
  now,
}: PublicationProductChangesTableProps) {
  if (changes.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Aún no se han detectado cambios"
        description="Los cambios de precio y stock aparecerán aquí cuando se detecten."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Imagen</TableHead>
          <TableHead>Nombre corto</TableHead>
          <TableHead>Tienda</TableHead>
          <TableHead>URL publicación</TableHead>
          <TableHead>Cambio</TableHead>
          <TableHead>Ejecutado hace</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {changes.map((change) => {
          const formattedChange = formatChange(change);
          const directionClass =
            change.changeType === 'price' ? changeDirectionClass(formattedChange.direction) : '';

          return (
            <TableRow key={`${change.historyId}-${change.changeType}`}>
              <TableCell>
                {change.product.imageUrl ? (
                  <img
                    src={change.product.imageUrl}
                    alt={`Imagen de ${change.product.shortName}`}
                    className="size-12 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                    aria-label={`Sin imagen para ${change.product.shortName}`}
                  >
                    <ImageOff className="size-4" />
                  </div>
                )}
              </TableCell>
              <TableCell className="min-w-48 font-medium">{change.product.shortName}</TableCell>
              <TableCell>{change.storeName ?? '—'}</TableCell>
              <TableCell className="max-w-80">
                {change.publicationUrl ? (
                  <a
                    href={change.publicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={change.publicationUrl}
                    className="inline-flex max-w-full items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <span className="truncate">{change.publicationUrl}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <span className={directionClass}>
                  {change.changeType === 'price' ? 'Precio: ' : 'Stock: '}
                  {formattedChange.currentValue}
                </span>
                {formattedChange.difference !== null && (
                  <span className={`ml-1 inline-flex items-center gap-0.5 ${directionClass}`}>
                    ({formattedChange.direction === 'positive' && <ArrowUp className="size-3" />}
                    {formattedChange.direction === 'negative' && <ArrowDown className="size-3" />}
                    <span>{formattedChange.difference}</span>)
                  </span>
                )}
              </TableCell>
              <TableCell>{formatRelativeExecutionTime(change.changedAt, now)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
