import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ProductImageLink } from './product-image-link';

describe('ProductImageLink', () => {
  it('links a product image to its internal detail page', () => {
    render(
      <MemoryRouter>
        <ProductImageLink
          productId="8d8c883c-7e36-4af0-a8b3-152b20c41f3c"
          productName="Cámara"
          imageUrl="https://media.example.test/products/camera.png"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Ver detalles de Cámara' })).toHaveAttribute(
      'href',
      '/products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
    );
    expect(screen.getByRole('img', { name: 'Imagen de Cámara' })).toBeInTheDocument();
  });

  it('keeps external variants without an associated product unlinked', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductImageLink productName="Variante externa" imageUrl={null} />
      </MemoryRouter>,
    );

    expect(container.querySelector('a')).not.toBeInTheDocument();
    expect(
      container.querySelector('[aria-label="Sin imagen para Variante externa"]'),
    ).toBeInTheDocument();
  });
});
