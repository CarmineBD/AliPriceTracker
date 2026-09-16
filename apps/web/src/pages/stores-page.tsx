import { useQuery } from '@tanstack/react-query';

import { getStores } from '@/api/stores.api';
import { StoresTable } from '@/features/stores/stores-table';
import { AppLayout } from '@/layouts/app-layout';

export function StoresPage() {
  const storesQuery = useQuery({
    queryKey: ['stores'],
    queryFn: getStores,
  });

  return (
    <AppLayout>
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Tiendas</h1>
        <p className="mt-2 text-slate-600">
          Consulta las tiendas registradas y las publicaciones importadas de cada una.
        </p>
      </div>

      <section className="mt-8" aria-labelledby="stores-list-title">
        <h2 id="stores-list-title" className="text-xl font-medium">
          Listado de tiendas
        </h2>
        <div className="mt-4">
          {storesQuery.isPending && <p role="status">Cargando tiendas…</p>}
          {storesQuery.isError && (
            <p className="text-destructive" role="alert">
              No se pudieron cargar las tiendas. Comprueba que la API y la base de datos estén
              disponibles.
            </p>
          )}
          {storesQuery.isSuccess && <StoresTable stores={storesQuery.data} />}
        </div>
      </section>
    </AppLayout>
  );
}
