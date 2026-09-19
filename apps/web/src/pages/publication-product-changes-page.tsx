import { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getPublicationProductChanges } from '@/api/publication-product-changes.api';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { PublicationProductChangesTable } from '@/features/publication-product-changes/publication-product-changes-table';
import { AppLayout } from '@/layouts/app-layout';

const pageSize = 20;

function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}

export function PublicationProductChangesPage() {
  const [page, setPage] = useState(1);
  const now = useCurrentTime();
  const changesQuery = useQuery({
    queryKey: ['publication-product-changes', { page, pageSize }],
    queryFn: () => getPublicationProductChanges({ page, pageSize }),
    refetchInterval: 30_000,
  });
  const pagination = changesQuery.data?.pagination;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Últimos cambios</h1>
        <p className="mt-2 text-slate-600">
          Cambios detectados en el precio y el stock de las publicaciones, ordenados de más
          recientes a más antiguos.
        </p>
      </div>

      <section aria-labelledby="publication-product-changes-list-title">
        <h2 id="publication-product-changes-list-title" className="sr-only">
          Listado de cambios recientes
        </h2>
        {changesQuery.isPending && <p role="status">Cargando cambios recientes…</p>}
        {changesQuery.isError && (
          <p className="text-destructive" role="alert">
            No se pudieron cargar los cambios recientes. Comprueba que la API y la base de datos
            estén disponibles.
          </p>
        )}
        {changesQuery.isSuccess && (
          <>
            <PublicationProductChangesTable changes={changesQuery.data.changes} now={now} />
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  Mostrando {(pagination.page - 1) * pagination.pageSize + 1}–
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{' '}
                  {pagination.total} cambios
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        text="Anterior"
                        aria-label="Ir a la página anterior"
                        href={pagination.page > 1 ? '#' : undefined}
                        className={
                          pagination.page === 1 ? 'pointer-events-none opacity-50' : undefined
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          if (pagination.page > 1) setPage(pagination.page - 1);
                        }}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        text="Siguiente"
                        aria-label="Ir a la página siguiente"
                        href={pagination.page < pagination.totalPages ? '#' : undefined}
                        className={
                          pagination.page === pagination.totalPages
                            ? 'pointer-events-none opacity-50'
                            : undefined
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          if (pagination.page < pagination.totalPages) setPage(pagination.page + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </section>
    </AppLayout>
  );
}
