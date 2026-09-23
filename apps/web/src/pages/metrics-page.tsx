import { useQuery } from '@tanstack/react-query';

import { getMetrics } from '@/api/metrics.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/layouts/app-layout';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Beneficio realizado</CardTitle>
                <CardDescription>
                  Ingresos netos de ventas completadas menos el envío asumido y su coste FIFO.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">
                  {currencyFormatter.format(metricsQuery.data.realizedProfit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow</CardTitle>
                <CardDescription>
                  Flujo neto de caja de las ventas tras restar el envío asumido y todas las compras.
                </CardDescription>
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
                <CardTitle>Valor del stock</CardTitle>
                <CardDescription>
                  Coste FIFO de las unidades recibidas que siguen disponibles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">
                  {currencyFormatter.format(metricsQuery.data.stockValue)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Beneficio potencial del stock</CardTitle>
                <CardDescription>
                  Valor de venta estimado menos el coste FIFO restante.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">
                  {currencyFormatter.format(metricsQuery.data.potentialStockProfit)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
