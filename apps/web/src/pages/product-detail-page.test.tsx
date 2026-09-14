import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ProductDetailPage } from './product-detail-page';

const product = {
  id: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
  name: 'Producto de prueba',
  shortName: 'Prueba',
  imageKey: 'products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c/example.png',
  imageUrl: 'https://media.example.test/products/8d8c883c-7e36-4af0-a8b3-152b20c41f3c/example.png',
  offersCount: 1,
  offers: [
    {
      id: '8d8c883c-7e36-4af0-a8b3-152b20c41f3d',
      sellerName: 'Tienda de prueba',
      sellerLocation: 'Madrid',
      sellerReviewScore: '4.8',
      sellerSalesCount: 125,
      quantityAvailable: 10,
      maxPurchase: 2,
      url: 'https://www.aliexpress.com/item/123.html',
    },
  ],
  description: 'Descripción de prueba.',
  createdAt: '2026-09-14T10:00:00.000Z',
  updatedAt: '2026-09-14T11:00:00.000Z',
};

const { getProductMock } = vi.hoisted(() => ({ getProductMock: vi.fn() }));

vi.mock('@/api/products.api', () => ({ getProduct: getProductMock }));

describe('ProductDetailPage', () => {
  it('shows the product data and a cropped 128 px image', async () => {
    getProductMock.mockResolvedValue(product);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/products/${product.id}`]}>
          <Routes>
            <Route path="/products/:id" element={<ProductDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const image = await screen.findByRole('img', { name: 'Imagen de Producto de prueba' });

    expect(getProductMock).toHaveBeenCalledWith(product.id);
    expect(image).toHaveAttribute('src', product.imageUrl);
    expect(image).toHaveClass('size-32', 'object-cover');
    expect(screen.getByRole('heading', { name: product.name })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ofertas disponibles (1)' })).toBeInTheDocument();
    expect(screen.getByText('Tienda de prueba')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver oferta' })).toHaveAttribute(
      'href',
      'https://www.aliexpress.com/item/123.html',
    );
    expect(screen.getByText(product.shortName)).toBeInTheDocument();
    expect(screen.getByText(product.description)).toBeInTheDocument();
    expect(screen.getByText('Fecha de actualización')).toBeInTheDocument();
    expect(screen.getByText('Fecha de creación')).toBeInTheDocument();
  });
});
