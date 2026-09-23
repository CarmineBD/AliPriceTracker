import type { Store } from '@alitracker/shared';
import { Store as StoreIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type StoresTableProps = {
  stores: Store[];
};

function displayValue(value: string | number | null) {
  return value ?? '—';
}

export function StoresTable({ stores }: StoresTableProps) {
  if (stores.length === 0) {
    return (
      <EmptyState
        icon={StoreIcon}
        title="Aún no hay tiendas"
        description="Las tiendas aparecerán aquí al importar una publicación de AliExpress."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Localización</TableHead>
            <TableHead className="text-right">Puntuación</TableHead>
            <TableHead className="text-right">Ventas últimos 6 meses</TableHead>
            <TableHead className="text-right">Publicaciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stores.map((store) => (
            <TableRow key={store.id}>
              <TableCell className="font-medium">
                <Link
                  to={`/stores/${store.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {displayValue(store.name)}
                </Link>
              </TableCell>
              <TableCell>{displayValue(store.location)}</TableCell>
              <TableCell className="text-right">{displayValue(store.reviewScore)}</TableCell>
              <TableCell className="text-right">{displayValue(store.sales180d)}</TableCell>
              <TableCell className="text-right">{store.publicationsCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
