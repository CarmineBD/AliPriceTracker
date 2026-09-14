import type { Product } from '@alitracker/shared';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProductsTable } from './products-table';

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const product: Product = {
  id: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
  name: 'Producto de prueba',
  shortName: null,
  imageKey: 'products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c/example.png',
  imageUrl: 'https://media.example.test/products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c/example.png',
  description: null,
  createdAt: '2026-09-14T10:00:00.000Z',
  updatedAt: '2026-09-14T10:00:00.000Z',
};

describe('ProductsTable', () => {
  it('shows a square 64 px product image from the public URL returned by the API', () => {
    render(
      <MemoryRouter>
        <ProductsTable products={[product]} onEdit={vi.fn()} onDelete={vi.fn()} />
      </MemoryRouter>,
    );

    const image = screen.getByRole('img', { name: 'Imagen de Producto de prueba' });

    expect(image).toHaveAttribute('src', product.imageUrl);
    expect(image).toHaveClass('size-16', 'object-cover');
    expect(screen.getByRole('button', { name: 'Ver detalle de Producto de prueba' })).toHaveAttribute(
      'href',
      `/products/${product.id}`,
    );
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Imagen',
      'ID',
      'Nombre corto',
      'Acciones',
    ]);
  });

  it('copies the product ID and confirms it with a toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <MemoryRouter>
        <ProductsTable products={[product]} onEdit={vi.fn()} onDelete={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copiar ID de Producto de prueba' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(product.id);
      expect(toastMock).toHaveBeenCalledWith({ title: 'ID copiado correctamente.' });
    });
  });
});
