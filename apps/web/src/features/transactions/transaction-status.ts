import type { PurchaseStatus, SaleStatus } from '@alitracker/shared';

export type TransactionKind = 'purchase' | 'sale';
export type TransactionStatus = PurchaseStatus | SaleStatus;
export type TransactionStatusOption = { value: TransactionStatus; label: string };

const purchaseStatusOptions: TransactionStatusOption[] = [
  { value: 'ordered', label: 'Pedido' },
  { value: 'received', label: 'Recibido' },
  { value: 'returned', label: 'Devuelto' },
];

const saleStatusOptions: TransactionStatusOption[] = [
  { value: 'to_be_sent', label: 'Por enviar' },
  { value: 'sent', label: 'Enviado' },
  { value: 'completed', label: 'Completado' },
];

export function getTransactionStatusOptions(kind: TransactionKind): TransactionStatusOption[] {
  return kind === 'purchase' ? purchaseStatusOptions : saleStatusOptions;
}
