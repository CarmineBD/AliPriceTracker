import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProductFormDialog } from './product-form-dialog';

afterEach(cleanup);

describe('ProductFormDialog', () => {
  it('uses a dialog and groups the product controls in a fieldset', () => {
    render(<ProductFormDialog open isSaving={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Agregar producto' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Datos del producto' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Nombre corto' })).toBeRequired();
  });

  it('uses DialogClose for the cancel action', () => {
    const onOpenChange = vi.fn();

    render(
      <ProductFormDialog open isSaving={false} onOpenChange={onOpenChange} onSubmit={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
