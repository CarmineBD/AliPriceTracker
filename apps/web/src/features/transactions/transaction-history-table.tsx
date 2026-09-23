import type { PurchaseHistoryEntry, SaleHistoryEntry } from '@alitracker/shared';
import { ExternalLink, ImageOff, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type TransactionKind = 'purchase' | 'sale';
type Transaction = PurchaseHistoryEntry | SaleHistoryEntry;

type TransactionHistoryTableProps = {
  kind: TransactionKind;
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });
const currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

const statusLabels: Record<string, string> = {
  ordered: 'Pedido',
  received: 'Recibido',
  returned: 'Devuelto',
  to_be_sent: 'Por enviar',
  sent: 'Enviado',
  completed: 'Completado',
};

function statusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'returned') return 'destructive';
  if (status === 'completed' || status === 'received') return 'default';
  if (status === 'sent') return 'secondary';
  return 'outline';
}

function hasPublicationUrl(
  transaction: Transaction,
): transaction is PurchaseHistoryEntry & { publicationUrl: string } {
  return 'publicationUrl' in transaction && transaction.publicationUrl !== null;
}

export function TransactionHistoryTable({
  kind,
  transactions,
  onEdit,
  onDelete,
}: TransactionHistoryTableProps) {
  const entityName = kind === 'purchase' ? 'compras' : 'ventas';

  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay {entityName}.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead>Nombre corto</TableHead>
          {kind === 'purchase' && <TableHead>Publicación</TableHead>}
          <TableHead className="text-right">
            {kind === 'purchase' ? 'Precio final total' : 'Precio de venta'}
          </TableHead>
          {kind === 'sale' && <TableHead className="text-right">Envío asumido</TableHead>}
          {kind === 'sale' && <TableHead className="text-right">Ingreso neto</TableHead>}
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => {
          const amount =
            'totalFinalPrice' in transaction
              ? transaction.totalFinalPrice
              : transaction.totalSalePrice;
          return (
            <TableRow key={transaction.id}>
              <TableCell>{dateFormatter.format(new Date(transaction.date))}</TableCell>
              <TableCell>
                {transaction.imageUrl ? (
                  <img
                    src={transaction.imageUrl}
                    alt={`Imagen de ${transaction.shortName}`}
                    className="size-10 rounded-md border object-cover"
                  />
                ) : (
                  <span
                    className="flex size-10 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                    aria-label={`Sin imagen para ${transaction.shortName}`}
                  >
                    <ImageOff className="size-4" />
                  </span>
                )}
              </TableCell>
              <TableCell className="font-medium">{transaction.shortName}</TableCell>
              {kind === 'purchase' && (
                <TableCell>
                  {hasPublicationUrl(transaction) ? (
                    <a
                      href={transaction.publicationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Ver publicación <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No disponible</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-right">{currencyFormatter.format(amount)}</TableCell>
              {'shippingCost' in transaction && (
                <>
                  <TableCell className="text-right">
                    {currencyFormatter.format(transaction.shippingCost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {currencyFormatter.format(
                      transaction.totalSalePrice - transaction.shippingCost,
                    )}
                  </TableCell>
                </>
              )}
              <TableCell>
                <Badge variant={statusVariant(transaction.status)}>
                  {statusLabels[transaction.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${entityName.slice(0, -1)} de ${transaction.shortName}`}
                    onClick={() => onEdit(transaction)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Eliminar ${entityName.slice(0, -1)} de ${transaction.shortName}`}
                    onClick={() => onDelete(transaction)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
