import { useState } from 'react';

import type {
  PurchaseCreateInput,
  PurchaseHistoryEntry,
  PurchaseUpdateInput,
  SaleCreateInput,
  SaleHistoryEntry,
  SaleUpdateInput,
} from '@alitracker/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import {
  createPurchase,
  createSale,
  deletePurchase,
  deleteSale,
  getPurchases,
  getSales,
  updatePurchase,
  updateSale,
} from '@/api/transactions.api';
import { getProductOptions } from '@/api/products.api';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { DeleteTransactionDialog } from './delete-transaction-dialog';
import { TransactionFormDialog } from './transaction-form-dialog';
import { TransactionHistoryTable } from './transaction-history-table';
import { AppLayout } from '@/layouts/app-layout';

const pageSize = 20;

type TransactionKind = 'purchase' | 'sale';
type Transaction = PurchaseHistoryEntry | SaleHistoryEntry;
type PaginationData = { page: number; pageSize: number; total: number; totalPages: number };
type TransactionList = { transactions: Transaction[]; pagination: PaginationData };

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

export function TransactionsPage({ kind }: { kind: TransactionKind }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [formTransaction, setFormTransaction] = useState<Transaction | null | undefined>(undefined);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction>();
  const transactionsQuery = useQuery({
    queryKey: [kind === 'purchase' ? 'purchases' : 'sales', { page, pageSize }],
    queryFn: async (): Promise<TransactionList> => {
      if (kind === 'purchase') {
        const result = await getPurchases({ page, pageSize });
        return { transactions: result.purchases, pagination: result.pagination };
      }
      const result = await getSales({ page, pageSize });
      return { transactions: result.sales, pagination: result.pagination };
    },
  });
  const productOptionsQuery = useQuery({
    queryKey: ['product-options'],
    queryFn: getProductOptions,
    enabled: formTransaction !== undefined,
  });

  const refreshTransactions = async () => {
    await queryClient.invalidateQueries({
      queryKey: [kind === 'purchase' ? 'purchases' : 'sales'],
    });
  };

  const saveMutation = useMutation<void, Error, PurchaseCreateInput | SaleCreateInput>({
    mutationFn: async (input) => {
      if (kind === 'purchase') {
        if (formTransaction) {
          await updatePurchase(formTransaction.id, input as PurchaseUpdateInput);
        } else {
          await createPurchase(input as PurchaseCreateInput);
        }
        return;
      }
      if (formTransaction) {
        await updateSale(formTransaction.id, input as SaleUpdateInput);
      } else {
        await createSale(input as SaleCreateInput);
      }
    },
    onSuccess: async () => {
      setFormTransaction(undefined);
      await refreshTransactions();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => (kind === 'purchase' ? deletePurchase(id) : deleteSale(id)),
    onSuccess: async () => {
      setTransactionToDelete(undefined);
      if (transactionsQuery.data?.transactions.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await refreshTransactions();
      }
    },
  });

  const label = kind === 'purchase' ? 'Compras' : 'Ventas';
  const transactions = transactionsQuery.data?.transactions ?? [];

  return (
    <AppLayout>
      <section aria-labelledby={`${kind}-title`}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 id={`${kind}-title`} className="text-3xl font-semibold text-slate-900">
              {label}
            </h1>
            <p className="mt-2 text-slate-600">Historial de {label.toLowerCase()} registradas.</p>
          </div>
          <Button
            onClick={() => {
              saveMutation.reset();
              setFormTransaction(null);
            }}
          >
            <Plus />
            Añadir registro
          </Button>
        </div>

        {transactionsQuery.isPending && <p role="status">Cargando {label.toLowerCase()}…</p>}
        {transactionsQuery.isError && (
          <p className="text-destructive" role="alert">
            No se pudieron cargar las {label.toLowerCase()}. Comprueba que la API y la base de datos
            estén disponibles.
          </p>
        )}
        {transactionsQuery.isSuccess && (
          <>
            <TransactionHistoryTable
              kind={kind}
              transactions={transactions}
              onEdit={(transaction) => {
                saveMutation.reset();
                setFormTransaction(transaction);
              }}
              onDelete={(transaction) => {
                deleteMutation.reset();
                setTransactionToDelete(transaction);
              }}
              onCreate={() => {
                saveMutation.reset();
                setFormTransaction(null);
              }}
            />
            <PaginationControls
              pagination={transactionsQuery.data.pagination}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

      <TransactionFormDialog
        kind={kind}
        open={formTransaction !== undefined}
        transaction={formTransaction ?? undefined}
        productOptions={productOptionsQuery.data ?? []}
        productOptionsLoading={productOptionsQuery.isPending}
        isSaving={saveMutation.isPending}
        error={saveMutation.error instanceof Error ? saveMutation.error.message : undefined}
        onOpenChange={(open) => {
          if (!open && !saveMutation.isPending) setFormTransaction(undefined);
        }}
        onSubmit={(input) => saveMutation.mutate(input)}
      />
      <DeleteTransactionDialog
        kind={kind}
        transaction={transactionToDelete}
        isDeleting={deleteMutation.isPending}
        error={deleteMutation.error instanceof Error ? deleteMutation.error.message : undefined}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setTransactionToDelete(undefined);
        }}
        onConfirm={() => transactionToDelete && deleteMutation.mutate(transactionToDelete.id)}
      />
    </AppLayout>
  );
}
