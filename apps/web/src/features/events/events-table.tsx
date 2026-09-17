import type { ActiveEvent } from '@alitracker/shared';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type EventsTableProps = {
  events: ActiveEvent[];
  onEdit: (event: ActiveEvent) => void;
  onDelete: (event: ActiveEvent) => void;
};

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function EventsTable({ events, onEdit, onDelete }: EventsTableProps) {
  if (events.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay eventos.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Inicio</TableHead>
          <TableHead>Fin</TableHead>
          <TableHead className="text-right">Cupones</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="font-medium">{event.name}</TableCell>
            <TableCell>{dateFormatter.format(new Date(event.startsAt))}</TableCell>
            <TableCell>{dateFormatter.format(new Date(event.endsAt))}</TableCell>
            <TableCell className="text-right">{event.coupons.length}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar ${event.name}`}
                  onClick={() => onEdit(event)}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar ${event.name}`}
                  onClick={() => onDelete(event)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
