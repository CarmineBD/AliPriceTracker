import { useQuery } from '@tanstack/react-query';

import { getStock } from '@/api/stock.api';
import { StockTable } from '@/features/stock/stock-table';
import { AppLayout } from '@/layouts/app-layout';

export function StockPage() {
  const stockQuery = useQuery({
    queryKey: ['stock'],
    queryFn: getStock,
  });
  const availableStock = stockQuery.data?.stock.filter((product) => product.quantity > 0) ?? [];

  return (
    <AppLayout>
      <section aria-labelledby="stock-title">
        <div className="mb-6">
          <h1 id="stock-title" className="text-3xl font-semibold text-slate-900">
            Stock
          </h1>
          <p className="mt-2 text-slate-600">
            Consulta las unidades disponibles de cada producto y las operaciones pendientes.
          </p>
        </div>

        {stockQuery.isPending && <p role="status">Cargando stock…</p>}
        {stockQuery.isError && (
          <p className="text-destructive" role="alert">
            No se pudo cargar el stock. Comprueba que la API y la base de datos estén disponibles.
          </p>
        )}
        {stockQuery.isSuccess && <StockTable stock={availableStock} />}
      </section>
    </AppLayout>
  );
}
