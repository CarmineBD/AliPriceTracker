import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useState } from 'react';

import { getPublicationProductHistory } from '@/api/publication-product-history.api';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { PublicationProductHistoryChart } from './publication-product-history-chart';
import type { HistoryRange } from './publication-product-history.types';
import {
  buildHistoryChartData,
  formatPrice,
  getRangeFrom,
} from './publication-product-history.utils';

type PublicationProductHistoryDialogProps = {
  publicationProductId: string;
  productName: string;
  aliexpressSkuId: string;
};

const ranges: Array<{ value: HistoryRange; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'Todo' },
];

function formatLastCheckedAt(value: string | null): string {
  if (!value) return '—';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function PublicationProductHistoryDialog({
  publicationProductId,
  productName,
  aliexpressSkuId,
}: PublicationProductHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<HistoryRange>('7d');
  const [from, setFrom] = useState<string | undefined>(() => getRangeFrom('7d'));

  const historyQuery = useQuery({
    queryKey: ['publication-product-history', publicationProductId, range, from],
    queryFn: () => getPublicationProductHistory(publicationProductId, { from }),
    enabled: open,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const historyResponse = historyQuery.data;
  const chartData = historyResponse
    ? buildHistoryChartData({
        baseline: historyResponse.baseline,
        history: historyResponse.history,
        current: historyResponse.publicationProduct.current,
        from,
        lastCheckedAt: historyResponse.publicationProduct.lastCheckedAt,
      })
    : [];

  function selectRange(nextRange: HistoryRange) {
    setRange(nextRange);
    setFrom(getRangeFrom(nextRange));
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Ver histórico
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Histórico</DialogTitle>
            <DialogDescription>
              <span className="block">{productName}</span>
              <span className="font-mono text-xs">SKU AliExpress: {aliexpressSkuId}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2" aria-label="Rango del histórico">
            {ranges.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={range === option.value ? 'default' : 'outline'}
                aria-pressed={range === option.value}
                onClick={() => selectRange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {historyQuery.isPending && (
            <p className="py-16 text-center text-muted-foreground" role="status">
              Cargando histórico…
            </p>
          )}

          {historyQuery.isError && (
            <p className="py-16 text-center text-destructive" role="alert">
              No se pudo cargar el histórico.
            </p>
          )}

          {historyResponse && !historyQuery.isError && chartData.length === 0 && (
            <EmptyState
              icon={History}
              title="Aún no hay datos históricos disponibles"
              description="El histórico aparecerá tras las próximas comprobaciones de la publicación."
            />
          )}

          {historyResponse && !historyQuery.isError && chartData.length > 0 && (
            <PublicationProductHistoryChart
              data={chartData}
              range={range}
              currency={historyResponse.publicationProduct.current.currency}
            />
          )}

          {historyResponse && !historyQuery.isError && (
            <dl className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Precio actual</dt>
                <dd className="mt-1 font-medium">
                  {formatPrice(
                    historyResponse.publicationProduct.current.price === null
                      ? null
                      : Number(historyResponse.publicationProduct.current.price),
                    historyResponse.publicationProduct.current.currency,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Stock actual</dt>
                <dd className="mt-1 font-medium">
                  {historyResponse.publicationProduct.current.quantityAvailable ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Última comprobación</dt>
                <dd className="mt-1 font-medium">
                  {formatLastCheckedAt(historyResponse.publicationProduct.lastCheckedAt)}
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
