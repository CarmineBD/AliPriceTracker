import { useState } from 'react';

import type { ActiveEvent, CouponResponse, EventSaveInput } from '@alitracker/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import {
  createCoupon,
  createEvent,
  deleteCoupon,
  deleteEvent,
  getCouponOptions,
  getCoupons,
  getEvents,
  updateCoupon,
  updateEvent,
} from '@/api/events.api';
import { Button } from '@/components/ui/button';
import { CouponDiscountBadge } from '@/components/coupon-discount-badge';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { CouponFormDialog } from '@/features/events/coupon-form-dialog';
import { CouponTable } from '@/features/events/coupon-table';
import { DeleteEntityDialog } from '@/features/events/delete-entity-dialog';
import { EventFormDialog } from '@/features/events/event-form-dialog';
import { EventsTable } from '@/features/events/events-table';
import { AppLayout } from '@/layouts/app-layout';

const pageSize = 20;

type PaginationData = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

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

function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
}) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="mt-6 space-y-3">
      <p className="text-center text-sm text-muted-foreground">
        Mostrando {(pagination.page - 1) * pagination.pageSize + 1}–
        {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total}
      </p>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={pagination.page > 1 ? '#' : undefined}
              className={pagination.page === 1 ? 'pointer-events-none opacity-50' : undefined}
              onClick={(event) => {
                event.preventDefault();
                if (pagination.page > 1) onPageChange(pagination.page - 1);
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
                    onPageChange(item);
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
                if (pagination.page < pagination.totalPages) onPageChange(pagination.page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export function EventsPage() {
  const queryClient = useQueryClient();
  const [couponPage, setCouponPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [couponForm, setCouponForm] = useState<CouponResponse | null | undefined>(undefined);
  const [eventForm, setEventForm] = useState<ActiveEvent | null | undefined>(undefined);
  const [couponToDelete, setCouponToDelete] = useState<CouponResponse>();
  const [eventToDelete, setEventToDelete] = useState<ActiveEvent>();

  const couponsQuery = useQuery({
    queryKey: ['coupons', { page: couponPage, pageSize }],
    queryFn: () => getCoupons({ page: couponPage, pageSize }),
  });
  const eventsQuery = useQuery({
    queryKey: ['events', { page: eventPage, pageSize }],
    queryFn: () => getEvents({ page: eventPage, pageSize }),
  });
  const couponOptionsQuery = useQuery({
    queryKey: ['coupon-options'],
    queryFn: getCouponOptions,
    enabled: eventForm !== undefined,
  });

  const refreshCoupons = async () => {
    await queryClient.invalidateQueries({ queryKey: ['coupons'] });
  };
  const refreshEvents = async () => {
    await queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const saveCouponMutation = useMutation({
    mutationFn: (input: { minPurchase: number; discountAmount: number }) =>
      couponForm ? updateCoupon(couponForm.id, input) : createCoupon(input),
    onSuccess: async () => {
      setCouponForm(undefined);
      await Promise.all([
        refreshCoupons(),
        refreshEvents(),
        queryClient.invalidateQueries({ queryKey: ['coupon-options'] }),
      ]);
    },
  });
  const saveEventMutation = useMutation({
    mutationFn: (input: EventSaveInput) =>
      eventForm ? updateEvent(eventForm.id, input) : createEvent(input),
    onSuccess: async () => {
      setEventForm(undefined);
      await refreshEvents();
    },
  });
  const deleteCouponMutation = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: async () => {
      setCouponToDelete(undefined);
      if (couponsQuery.data?.coupons.length === 1 && couponPage > 1) {
        setCouponPage((current) => current - 1);
      } else {
        await refreshCoupons();
      }
      await Promise.all([
        refreshEvents(),
        queryClient.invalidateQueries({ queryKey: ['coupon-options'] }),
      ]);
    },
  });
  const deleteEventMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: async () => {
      setEventToDelete(undefined);
      if (eventsQuery.data?.events.length === 1 && eventPage > 1) {
        setEventPage((current) => current - 1);
      } else {
        await refreshEvents();
      }
    },
  });

  const couponFormOpen = couponForm !== undefined;
  const eventFormOpen = eventForm !== undefined;

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Eventos y cupones</h1>
        <p className="mt-2 text-slate-600">
          Gestiona los cupones disponibles y los eventos de AliExpress en los que se aplican.
        </p>
      </div>

      <div className="grid gap-12 xl:grid-cols-2">
        <section aria-labelledby="coupons-list-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 id="coupons-list-title" className="text-xl font-medium">
              Cupones
            </h2>
            <Button
              onClick={() => {
                saveCouponMutation.reset();
                setCouponForm(null);
              }}
            >
              <Plus />
              Agregar cupón
            </Button>
          </div>
          {couponsQuery.isPending && <p role="status">Cargando cupones…</p>}
          {couponsQuery.isError && (
            <p className="text-destructive" role="alert">
              No se pudieron cargar los cupones. Comprueba que la API y la base de datos están
              disponibles.
            </p>
          )}
          {couponsQuery.isSuccess && (
            <>
              <CouponTable
                coupons={couponsQuery.data.coupons}
                onEdit={(coupon) => {
                  saveCouponMutation.reset();
                  setCouponForm(coupon);
                }}
                onDelete={(coupon) => {
                  deleteCouponMutation.reset();
                  setCouponToDelete(coupon);
                }}
              />
              <PaginationControls
                pagination={couponsQuery.data.pagination}
                onPageChange={setCouponPage}
              />
            </>
          )}
        </section>

        <section aria-labelledby="events-list-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 id="events-list-title" className="text-xl font-medium">
              Eventos
            </h2>
            <Button
              onClick={() => {
                saveEventMutation.reset();
                setEventForm(null);
              }}
            >
              <Plus />
              Agregar evento
            </Button>
          </div>
          {eventsQuery.isPending && <p role="status">Cargando eventos…</p>}
          {eventsQuery.isError && (
            <p className="text-destructive" role="alert">
              No se pudieron cargar los eventos. Comprueba que la API y la base de datos están
              disponibles.
            </p>
          )}
          {eventsQuery.isSuccess && (
            <>
              <EventsTable
                events={eventsQuery.data.events}
                onEdit={(event) => {
                  saveEventMutation.reset();
                  setEventForm(event);
                }}
                onDelete={(event) => {
                  deleteEventMutation.reset();
                  setEventToDelete(event);
                }}
              />
              <PaginationControls
                pagination={eventsQuery.data.pagination}
                onPageChange={setEventPage}
              />
            </>
          )}
        </section>
      </div>

      <CouponFormDialog
        open={couponFormOpen}
        coupon={couponForm ?? undefined}
        isSaving={saveCouponMutation.isPending}
        error={
          saveCouponMutation.error instanceof Error ? saveCouponMutation.error.message : undefined
        }
        onOpenChange={(open) => {
          if (!open && !saveCouponMutation.isPending) setCouponForm(undefined);
        }}
        onSubmit={(input) => saveCouponMutation.mutate(input)}
      />
      <EventFormDialog
        open={eventFormOpen}
        event={eventForm ?? undefined}
        couponOptions={couponOptionsQuery.data ?? []}
        couponOptionsLoading={couponOptionsQuery.isPending}
        isSaving={saveEventMutation.isPending}
        error={
          saveEventMutation.error instanceof Error ? saveEventMutation.error.message : undefined
        }
        onOpenChange={(open) => {
          if (!open && !saveEventMutation.isPending) setEventForm(undefined);
        }}
        onSubmit={(input) => saveEventMutation.mutate(input)}
      />
      <DeleteEntityDialog
        entity={
          couponToDelete
            ? {
                type: 'cupón',
                label: <CouponDiscountBadge amount={couponToDelete.discountAmount} />,
              }
            : undefined
        }
        isDeleting={deleteCouponMutation.isPending}
        error={
          deleteCouponMutation.error instanceof Error
            ? deleteCouponMutation.error.message
            : undefined
        }
        onOpenChange={(open) => {
          if (!open && !deleteCouponMutation.isPending) setCouponToDelete(undefined);
        }}
        onConfirm={() => couponToDelete && deleteCouponMutation.mutate(couponToDelete.id)}
      />
      <DeleteEntityDialog
        entity={eventToDelete ? { type: 'evento', label: eventToDelete.name } : undefined}
        isDeleting={deleteEventMutation.isPending}
        error={
          deleteEventMutation.error instanceof Error ? deleteEventMutation.error.message : undefined
        }
        onOpenChange={(open) => {
          if (!open && !deleteEventMutation.isPending) setEventToDelete(undefined);
        }}
        onConfirm={() => eventToDelete && deleteEventMutation.mutate(eventToDelete.id)}
      />
    </AppLayout>
  );
}
