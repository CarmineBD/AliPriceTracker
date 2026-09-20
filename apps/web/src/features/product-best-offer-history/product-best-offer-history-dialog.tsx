import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getProductBestOfferHistory } from '@/api/product-best-offer-history.api';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { ProductBestOfferHistoryChart } from './product-best-offer-history-chart';
import type { BestOfferHistoryRange } from './product-best-offer-history.types';
import {
  buildBestOfferHistoryChartData,
  formatBestOfferPrice,
  getBestOfferRangeFrom,
} from './product-best-offer-history.utils';

const ranges: Array<{ value: BestOfferHistoryRange; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'Todo' },
];

export function ProductBestOfferHistoryDialog({
  productId,
  productName,
  embedded = false,
}: {
  productId: string;
  productName: string;
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<BestOfferHistoryRange>('7d');
  const [from, setFrom] = useState<string | undefined>(() => getBestOfferRangeFrom('7d'));
  const historyQuery = useQuery({
    queryKey: ['product-best-offer-history', productId, range, from],
    queryFn: () => getProductBestOfferHistory(productId, { from }),
    enabled: open || embedded,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
  const response = historyQuery.data;
  const chartData = response
    ? buildBestOfferHistoryChartData({
        baseline: response.baseline,
        history: response.history,
        current: response.current,
        from,
      })
    : [];
  const current = response?.current;

  const historyContent = (
    <>
      <div className="flex flex-wrap gap-2" aria-label="Rango del histórico">
        {ranges.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={range === option.value ? 'default' : 'outline'}
            aria-pressed={range === option.value}
            onClick={() => {
              setRange(option.value);
              setFrom(getBestOfferRangeFrom(option.value));
            }}
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
          No se pudo cargar el histórico de mejor oferta.
        </p>
      )}
      {response && !historyQuery.isError && chartData.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          Aún no hay datos históricos disponibles.
        </p>
      )}
      {response && !historyQuery.isError && chartData.length > 0 && (
        <ProductBestOfferHistoryChart
          data={chartData}
          range={range}
          currency={current?.currency ?? null}
        />
      )}
      {response && !historyQuery.isError && (
        <section className="border-t pt-4" aria-label="Mejor oferta actual">
          {current?.isAvailable ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>
                <span className="text-muted-foreground">Precio actual mínimo: </span>
                <strong>{formatBestOfferPrice(Number(current.price), current.currency)}</strong>
              </span>
              <span>
                <span className="text-muted-foreground">Stock: </span>
                <strong>{current.quantityAvailable}</strong>
              </span>
              {current.publicationUrl && (
                <a
                  className={buttonVariants({ size: 'sm' })}
                  href={current.publicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Comprar en AliExpress
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Actualmente no hay ninguna oferta disponible.
            </p>
          )}
        </section>
      )}
    </>
  );

  if (embedded) {
    return <div className="mt-4">{historyContent}</div>;
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Ver histórico de mejor precio
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de mejor oferta</DialogTitle>
            <DialogDescription>{productName}</DialogDescription>
          </DialogHeader>
          {historyContent}
        </DialogContent>
      </Dialog>
    </>
  );
}
