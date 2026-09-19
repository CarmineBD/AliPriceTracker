import type { Product } from '@alitracker/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProductsCards } from './products-cards';

afterEach(cleanup);

const product: Product = {
  id: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
  name: 'Producto de prueba',
  shortName: 'Prueba',
  imageKey: 'products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c/example.png',
  imageUrl: 'https://media.example.test/products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c/example.png',
  description: null,
  averageSellingPrice: null,
  effectiveSellingPrice: null,
  lowestAvailablePriceEuro: 9.5,
  offersCount: 3,
  offers: [],
  createdAt: '2026-09-14T10:00:00.000Z',
  updatedAt: '2026-09-14T10:00:00.000Z',
};

describe('ProductsCards', () => {
  it('shows the product image, title, edit action, and lowest available EUR price', () => {
    render(
      <MemoryRouter>
        <ProductsCards products={[product]} onEdit={vi.fn()} />
      </MemoryRouter>,
    );

    const image = screen.getByRole('img', { name: 'Imagen de Prueba' });

    expect(image).toHaveAttribute('src', product.imageUrl);
    expect(image).toHaveClass('aspect-square', 'w-full', 'object-cover');
    expect(screen.getByRole('link', { name: product.shortName })).toHaveAttribute(
      'href',
      `/products/${product.id}`,
    );
    expect(screen.queryByText(product.name)).not.toBeInTheDocument();
    expect(screen.queryByText('Precio más bajo')).not.toBeInTheDocument();
    expect(screen.getByText(/9,50\s*€/)).toBeInTheDocument();
    expect(screen.getByText('3 ofertas')).toBeInTheDocument();
  });

  it('opens editing through the card action', () => {
    const onEdit = vi.fn();

    render(
      <MemoryRouter>
        <ProductsCards products={[product]} onEdit={onEdit} />
      </MemoryRouter>,
    );

    const editButton = screen.getByRole('button', { name: 'Editar Prueba' });

    expect(editButton).toHaveClass(
      'cursor-pointer',
      'opacity-0',
      'group-hover/card:opacity-100',
      'group-focus-within/card:opacity-100',
    );
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(product);
  });
});
