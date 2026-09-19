import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getActiveEvents, getCouponOptions } from '@/api/events.api';
import { getOpportunities } from '@/api/opportunities.api';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { OpportunitiesTable } from '@/features/opportunities/opportunities-table';
import { OpportunityCouponFilters } from '@/features/opportunities/opportunity-coupon-filters';
import { AppLayout } from '@/layouts/app-layout';

const pageSize = 20;

function getPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

export function OpportunitiesPage() {
  const [page, setPage] = useState(1);
  const [selectedCouponIds, setSelectedCouponIds] = useState<string[] | null>(null);
  const activeEventsQuery = useQuery({
    queryKey: ['active-events'],
    queryFn: getActiveEvents,
  });
  const couponOptionsQuery = useQuery({
    queryKey: ['coupon-options'],
    queryFn: getCouponOptions,
  });
  const coupons = couponOptionsQuery.data ?? [];
  const activeCouponIds = new Set(activeEventsQuery.data?.[0]?.coupons.map((coupon) => coupon.id));
  const couponIds =
    selectedCouponIds ??
    coupons.filter((coupon) => activeCouponIds.has(coupon.id)).map((coupon) => coupon.id);
  const selectedCoupons = coupons.filter((coupon) => couponIds.includes(coupon.id));
  const couponDefaultsReady = activeEventsQuery.isSuccess && couponOptionsQuery.isSuccess;
  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', { sort: 'roi-desc', page, pageSize, couponIds }],
    enabled: couponDefaultsReady,
    queryFn: () =>
      getOpportunities(
        couponIds.length > 0
          ? { sort: 'roi-desc', page, pageSize, couponIds }
          : { sort: 'roi-desc', page, pageSize },
      ),
  });
  const pagination = opportunitiesQuery.data?.pagination;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Oportunidades</h1>
        <p className="mt-2 text-slate-600">
          Productos ordenados de mayor a menor ROI estimado para la compra de una unidad.
        </p>
      </div>

      <section aria-labelledby="opportunities-list-title">
        <OpportunityCouponFilters
          coupons={coupons}
          selectedCoupons={selectedCoupons}
          disabled={couponOptionsQuery.isPending || couponOptionsQuery.isError}
          onSelectedCouponsChange={(coupons) => {
            setSelectedCouponIds(coupons.map((coupon) => coupon.id));
            setPage(1);
          }}
        />
        <h2 id="opportunities-list-title" className="sr-only">
          Listado de oportunidades
        </h2>
        {opportunitiesQuery.isPending && <p role="status">Cargando oportunidades…</p>}
        {opportunitiesQuery.isError && (
          <p className="text-destructive" role="alert">
            No se pudieron cargar las oportunidades. Comprueba que la API y la base de datos estén
            disponibles.
          </p>
        )}
        {opportunitiesQuery.isSuccess && (
          <>
            <OpportunitiesTable opportunities={opportunitiesQuery.data.opportunities} />
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  Mostrando {(pagination.page - 1) * pagination.pageSize + 1}–
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{' '}
                  {pagination.total} oportunidades
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
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
                    {getPageItems(pagination.page, pagination.totalPages).map((item, index) =>
                      item === 'ellipsis' ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={item}>
                          <PaginationLink
                            href="#"
                            isActive={item === pagination.page}
                            onClick={(event) => {
                              event.preventDefault();
                              setPage(item);
                            }}
                          >
                            {item}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}
                    <PaginationItem>
                      <PaginationNext
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
