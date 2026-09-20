import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getActiveEvents, getCouponOptions } from '@/api/events.api';
import { getBestCouponCombinations, getOpportunities } from '@/api/opportunities.api';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OpportunitiesTable } from '@/features/opportunities/opportunities-table';
import { CombinedOpportunitiesTable } from '@/features/opportunities/combined-opportunities-table';
import { BestCouponCombinationsTable } from '@/features/opportunities/best-coupon-combinations-table';
import { OpportunityCouponFilters } from '@/features/opportunities/opportunity-coupon-filters';
import { AppLayout } from '@/layouts/app-layout';

const pageSize = 20;

const wholeAmountFormatter = new Intl.NumberFormat('es-ES', {
  useGrouping: true,
  maximumFractionDigits: 0,
});

const totalRoiFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
});

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
  const [selectedCombinationIds, setSelectedCombinationIds] = useState<string[] | null>(null);
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
  const bestCouponCombinationsQuery = useQuery({
    queryKey: ['best-coupon-combinations', { couponIds }],
    enabled: couponDefaultsReady,
    queryFn: () => getBestCouponCombinations(couponIds.length > 0 ? { couponIds } : {}),
  });
  const combinations = bestCouponCombinationsQuery.data?.combinations ?? [];
  const selectedBestCombinationIds =
    selectedCombinationIds ?? combinations.map((combination) => combination.coupon.id);
  const selectedBestCombinations = combinations.filter((combination) =>
    selectedBestCombinationIds.includes(combination.coupon.id),
  );
  const totalProfit = selectedBestCombinations.reduce(
    (total, combination) => total + combination.estimatedProfit,
    0,
  );
  const totalPurchasePrice = selectedBestCombinations.reduce(
    (total, combination) => total + combination.effectivePurchasePrice,
    0,
  );
  const totalRoi = totalPurchasePrice > 0 ? (totalProfit / totalPurchasePrice) * 100 : null;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Oportunidades</h1>
        <p className="mt-2 text-slate-600">
          Mejores opciones de compra para los cupones disponibles en el evento actual.
        </p>
      </div>

      <section aria-labelledby="opportunities-list-title">
        <OpportunityCouponFilters
          coupons={coupons}
          selectedCoupons={selectedCoupons}
          disabled={couponOptionsQuery.isPending || couponOptionsQuery.isError}
          onSelectedCouponsChange={(coupons) => {
            setSelectedCouponIds(coupons.map((coupon) => coupon.id));
            setSelectedCombinationIds(null);
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

      <section className="mt-10" aria-labelledby="combined-opportunities-title">
        <h2 id="combined-opportunities-title" className="text-xl font-semibold text-slate-900">
          Oportunidades combinadas
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La mejor compra de dos o más productos para cada cupón disponible.
        </p>
        {opportunitiesQuery.isPending && (
          <p className="mt-6" role="status">
            Cargando oportunidades combinadas…
          </p>
        )}
        {opportunitiesQuery.isError && (
          <p className="mt-6 text-destructive" role="alert">
            No se pudieron cargar las oportunidades combinadas.
          </p>
        )}
        {opportunitiesQuery.isSuccess && (
          <div className="mt-6">
            <CombinedOpportunitiesTable
              opportunities={opportunitiesQuery.data.comboOpportunities}
            />
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="best-coupon-combinations-title">
        <h2 id="best-coupon-combinations-title" className="text-xl font-semibold text-slate-900">
          Por cuenta
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Combinaciones de cupones que ofrecen el mayor beneficio total por cuenta.
        </p>
        {bestCouponCombinationsQuery.isPending && (
          <p className="mt-6" role="status">
            Cargando combinaciones por cupón…
          </p>
        )}
        {bestCouponCombinationsQuery.isError && (
          <p className="mt-6 text-destructive" role="alert">
            No se pudieron cargar las combinaciones por cupón.
          </p>
        )}
        {bestCouponCombinationsQuery.isSuccess && (
          <div className="mt-6 space-y-6">
            <Card>
              {/* <CardHeader>
                <CardTitle>Resultado de las compras seleccionadas</CardTitle>
              </CardHeader> */}
              <CardContent className="flex flex-wrap items-start justify-between gap-x-10 gap-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Inversión total</p>
                  <p className="text-xl font-semibold" aria-label="Inversión estimada">
                    {wholeAmountFormatter.format(totalPurchasePrice)} €
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm text-muted-foreground">Beneficio total</p>
                  <p
                    className="text-3xl font-semibold tracking-tight"
                    aria-label="Beneficio total estimado"
                  >
                    {wholeAmountFormatter.format(totalProfit)} €
                  </p>
                  <Badge variant="secondary">
                    ROI {totalRoi === null ? '—' : `${totalRoiFormatter.format(totalRoi)}%`}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <BestCouponCombinationsTable
              combinations={combinations}
              selectedCombinationIds={selectedBestCombinationIds}
              onSelectedCombinationIdsChange={setSelectedCombinationIds}
            />
          </div>
        )}
      </section>
    </AppLayout>
  );
}
