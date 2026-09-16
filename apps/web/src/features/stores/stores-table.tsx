import type { Store } from '@alitracker/shared';

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
    return <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay tiendas.</p>;
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
              <TableCell className="font-medium">{displayValue(store.name)}</TableCell>
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
