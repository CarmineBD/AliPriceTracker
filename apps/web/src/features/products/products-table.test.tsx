import type { Product } from '@alitracker/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProductsTable } from './products-table';

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
  it('shows a product image from the public URL returned by the API', () => {
    render(<ProductsTable products={[product]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Imagen de Producto de prueba' })).toHaveAttribute(
      'src',
      product.imageUrl,
    );
  });
});
