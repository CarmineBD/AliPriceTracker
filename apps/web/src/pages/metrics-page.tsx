import { useQuery } from '@tanstack/react-query';

import { getMetrics } from '@/api/metrics.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/layouts/app-layout';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

const roiFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 2,
});

export function MetricsPage() {
  const metricsQuery = useQuery({
    queryKey: ['metrics'],
    queryFn: getMetrics,
  });

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
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Beneficios</CardTitle>
              <CardDescription>Resultado acumulado de las operaciones registradas.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight">
                {currencyFormatter.format(metricsQuery.data.totalProfit)}{' '}
                <span className="text-base font-normal text-muted-foreground">
                  (
                  {metricsQuery.data.roi === null
                    ? 'ROI no disponible'
                    : `${roiFormatter.format(metricsQuery.data.roi)} %ROI`}
                  )
                </span>
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <p>
                  Ventas totales
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
        )}
      </section>
    </AppLayout>
  );
}
