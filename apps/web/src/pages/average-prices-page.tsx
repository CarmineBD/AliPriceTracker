import { useQuery } from '@tanstack/react-query';

import { getAveragePrices } from '@/api/average-prices.api';
import { AveragePricesTable } from '@/features/average-prices/average-prices-table';
import { AppLayout } from '@/layouts/app-layout';

export function AveragePricesPage() {
  const averagePricesQuery = useQuery({
    queryKey: ['average-prices'],
    queryFn: getAveragePrices,
  });

  return (
    <AppLayout>
      <section aria-labelledby="average-prices-title">
        <div className="mb-6">
          <h1 id="average-prices-title" className="text-3xl font-semibold text-slate-900">
            Precios medios
          </h1>
          <p className="mt-2 text-slate-600">
            Consulta el precio medio registrado para cada producto con historial.
          </p>
        </div>

        {averagePricesQuery.isPending && <p role="status">Cargando precios medios…</p>}
        {averagePricesQuery.isError && (
          <p className="text-destructive" role="alert">
            No se pudieron cargar los precios medios. Comprueba que la API y la base de datos estén
            disponibles.
          </p>
        )}
        {averagePricesQuery.isSuccess && (
          <AveragePricesTable
            sales={averagePricesQuery.data.sales}
            purchases={averagePricesQuery.data.purchases}
          />
        )}
      </section>
    </AppLayout>
  );
}
