import type { Product } from '@alitracker/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProductFormDialog } from './product-form-dialog';

afterEach(cleanup);

const product: Product = {
  id: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
  name: 'Producto de prueba',
  shortName: 'Prueba',
  imageKey: null,
  imageUrl: null,
  description: null,
  averageSellingPrice: null,
  effectiveSellingPrice: null,
  lowestAvailablePriceEuro: null,
  offersCount: 0,
  offers: [],
  createdAt: '2026-09-14T10:00:00.000Z',
  updatedAt: '2026-09-14T10:00:00.000Z',
};

describe('ProductFormDialog', () => {
  it('uses a dialog and groups the product controls in a fieldset', () => {
    render(<ProductFormDialog open isSaving={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Alta de producto' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Datos del producto' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Nombre corto' })).toBeRequired();
    expect(screen.getByRole('button', { name: 'Seleccionar imagen' })).toBeInTheDocument();
  });

  it('uses DialogClose for the cancel action', () => {
    const onOpenChange = vi.fn();

    render(
      <ProductFormDialog open isSaving={false} onOpenChange={onOpenChange} onSubmit={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ventana' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('shows the delete action only while editing and invokes its callback', () => {
    const onDelete = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <ProductFormDialog
        open
        product={product}
        isSaving={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar producto' }));

    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog', { name: 'Edición de producto' })).toBeInTheDocument();
    expect(screen.getByText('ID de producto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar ID de producto' }));
    expect(writeText).toHaveBeenCalledWith(product.id);
    expect(screen.queryByDisplayValue(product.id)).not.toBeInTheDocument();
  });
});
