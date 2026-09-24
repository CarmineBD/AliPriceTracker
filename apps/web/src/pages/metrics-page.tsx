import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';

import { getMetrics } from '@/api/metrics.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProfitHistorySection } from '@/features/metrics/profit-history-section';
import { AppLayout } from '@/layouts/app-layout';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const roiFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
});

function MetricsCardTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <CardTitle>{title}</CardTitle>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Información sobre ${title}`}
            />
          }
        >
          <Info />
        </TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-normal">{description}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function MetricsPage() {
  const metricsQuery = useQuery({
    queryKey: ['metrics'],
    queryFn: getMetrics,
  });
  const realizedRoi = metricsQuery.data?.realizedRoi ?? null;

  return (
    <AppLayout>
      <section aria-labelledby="metrics-title">
        <div className="mb-6">
          <h1 id="metrics-title" className="text-3xl font-semibold text-slate-900">
            Métricas
          </h1>
          <p className="mt-2 text-slate-600">Resumen global de la inversión, ventas y beneficio.</p>
        </div>

        {metricsQuery.isPending && <p role="status">Cargando métricas…</p>}
        {metricsQuery.isError && (
          <p className="text-destructive" role="alert">
            No se pudieron cargar las métricas. Comprueba que la API y la base de datos estén
            disponibles.
          </p>
        )}
        {metricsQuery.isSuccess && (
          <>
            <TooltipProvider>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <MetricsCardTitle
                      title="Gross Profit"
                      description="Beneficio realizado ingresos netos de ventas completadas menos el envío asumido y su coste FIFO."
                    />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tracking-tight">
                      {currencyFormatter.format(metricsQuery.data.realizedProfit)}
                      {realizedRoi !== null && (
                        <span className="ml-2 whitespace-nowrap text-base font-normal text-muted-foreground">
                          ({roiFormatter.format(realizedRoi)}% ROI)
                        </span>
                      )}
                    </p>
                    {metricsQuery.data.pendingSalesCount > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Incluye {metricsQuery.data.pendingSalesCount}{' '}
                        {metricsQuery.data.pendingSalesCount === 1
                          ? 'venta aún no completada.'
                          : 'ventas aún no completadas.'}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <MetricsCardTitle
                      title="Cash Flow"
                      description="Flujo neto de caja de las ventas tras restar el envío asumido y todas las compras."
                    />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tracking-tight">
                      {currencyFormatter.format(metricsQuery.data.netCashFlow)}
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <p>
                        Ingresos netos por ventas
                        <span className="mt-1 block font-medium text-foreground">
                          {currencyFormatter.format(metricsQuery.data.totalSales)}
                        </span>
                      </p>
                      <p>
                        Compras totales
                        <span className="mt-1 block font-medium text-foreground">
                          {currencyFormatter.format(metricsQuery.data.totalPurchases)}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <MetricsCardTitle
                      title="Beneficio potencial del stock"
                      description="Valor de venta estimado menos el coste FIFO restante."
                    />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tracking-tight">
                      {currencyFormatter.format(metricsQuery.data.potentialStockProfit)}
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <p>
                        Valor de compra
                        <span className="mt-1 block font-medium text-foreground">
                          {currencyFormatter.format(metricsQuery.data.stockCostValue)}
                        </span>
                      </p>
                      <p>
                        Valor estimado de venta
                        <span className="mt-1 block font-medium text-foreground">
                          {currencyFormatter.format(metricsQuery.data.estimatedStockSaleValue)}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TooltipProvider>
            <ProfitHistorySection />
          </>
        )}
      </section>
    </AppLayout>
  );
}
