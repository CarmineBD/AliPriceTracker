import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
      price: '591.70',
      currency: 'EUR',
      quantityAvailable: 10,
      maxPurchase: 2,
      url: 'https://www.aliexpress.com/item/123.html',
    },
  ],
  description: 'Descripción de prueba.',
  averageSellingPrice: 12.5,
  effectiveSellingPrice: 12.5,
  lowestAvailablePriceEuro: 591.7,
  createdAt: '2026-09-14T10:00:00.000Z',
  updatedAt: '2026-09-14T11:00:00.000Z',
};

const {
  getProductMock,
  getProductComponentsMock,
  getProductOptionsMock,
  deleteProductMock,
  replaceProductComponentsMock,
  updateProductMock,
  uploadProductImageMock,
} = vi.hoisted(() => ({
  getProductMock: vi.fn(),
  getProductComponentsMock: vi.fn().mockResolvedValue([]),
  getProductOptionsMock: vi.fn().mockResolvedValue([]),
  deleteProductMock: vi.fn(),
  replaceProductComponentsMock: vi.fn(),
  updateProductMock: vi.fn(),
  uploadProductImageMock: vi.fn(),
}));
const { getBestOfferHistoryMock } = vi.hoisted(() => ({ getBestOfferHistoryMock: vi.fn() }));
const { deletePublicationProductMock, reassignPublicationProductMock } = vi.hoisted(() => ({
  deletePublicationProductMock: vi.fn(),
  reassignPublicationProductMock: vi.fn(),
}));

vi.mock('@/api/products.api', () => ({
  getProduct: getProductMock,
  getProductComponents: getProductComponentsMock,
  getProductOptions: getProductOptionsMock,
  deleteProduct: deleteProductMock,
  replaceProductComponents: replaceProductComponentsMock,
  updateProduct: updateProductMock,
  uploadProductImage: uploadProductImageMock,
}));
vi.mock('@/api/product-best-offer-history.api', () => ({
  getProductBestOfferHistory: getBestOfferHistoryMock,
}));
vi.mock('@/api/publication-products.api', () => ({
  deletePublicationProduct: deletePublicationProductMock,
  reassignPublicationProduct: reassignPublicationProductMock,
}));

afterEach(cleanup);

describe('ProductDetailPage', () => {
  it('shows the product data, description, lowest price, and a larger image', async () => {
    getProductMock.mockResolvedValue(product);
    const productOffer = product.offers[0]!;
    getBestOfferHistoryMock.mockResolvedValue({
      product: { id: product.id, name: product.name },
      current: {
        id: '1f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
        isAvailable: true,
        publicationProductId: productOffer.id,
        price: '591.70',
        currency: 'EUR',
        quantityAvailable: 10,
        publicationUrl: productOffer.url,
        capturedAt: '2026-09-14T11:00:00.000Z',
      },
      baseline: null,
      history: [
        {
          id: '1f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
          isAvailable: true,
          publicationProductId: productOffer.id,
          price: '591.70',
          currency: 'EUR',
          quantityAvailable: 10,
          publicationUrl: productOffer.url,
          capturedAt: '2026-09-14T11:00:00.000Z',
        },
      ],
    });
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
    expect(image).toHaveClass('size-40', 'object-cover');
    expect(screen.getByRole('heading', { name: product.name })).toBeInTheDocument();
    expect(screen.getByText('Precio más bajo disponible')).toBeInTheDocument();
    expect(
      await screen.findByLabelText('Gráfica de histórico de mejor oferta'),
    ).toBeInTheDocument();
    expect(getBestOfferHistoryMock).toHaveBeenCalledWith(product.id, expect.any(Object));
    expect(screen.getByRole('heading', { name: 'Ofertas disponibles (1)' })).toBeInTheDocument();
    expect(screen.getByText('Tienda de prueba')).toBeInTheDocument();
    expect(screen.getAllByText(/591,70/)).not.toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Ver oferta' })).toHaveAttribute(
      'href',
      'https://www.aliexpress.com/item/123.html',
    );
    expect(screen.getByText(product.description)).toBeInTheDocument();
    expect(screen.getByText('Fecha de actualización')).toBeInTheDocument();
    expect(screen.getByText('Fecha de creación')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Productos que contiene (0)' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
  });

  it('shows contained products as compact cards and orders offers from cheapest to most expensive', async () => {
    const cheaperOffer = {
      ...product.offers[0]!,
      id: '7d8c883c-7e36-4af0-a8b3-152b20c41f3d',
      sellerName: 'Tienda barata',
      price: '25.50',
    };
    getProductMock.mockResolvedValue({
      ...product,
      offersCount: 2,
      offers: [product.offers[0], cheaperOffer],
    });
    getProductComponentsMock.mockResolvedValue([
      {
        productId: product.id,
        containsProductId: '9d8c883c-7e36-4af0-a8b3-152b20c41f3c',
        quantity: 3,
        product: {
          id: '9d8c883c-7e36-4af0-a8b3-152b20c41f3c',
          name: 'Producto contenido',
          shortName: 'Contenido',
          imageKey: null,
          imageUrl: null,
          averageSellingPrice: null,
          effectiveSellingPrice: null,
        },
      },
    ]);
    getBestOfferHistoryMock.mockResolvedValue({
      product: { id: product.id, name: product.name },
      current: null,
      baseline: null,
      history: [],
    });
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

    expect(await screen.findByText('Contenido')).toBeInTheDocument();
    expect(screen.getByText('x3')).toBeInTheDocument();
    expect(screen.getByLabelText('Sin imagen para Contenido')).toBeInTheDocument();

    const offerRows = screen
      .getAllByRole('row')
      .filter(
        (row) =>
          row.textContent?.includes('Tienda de prueba') ||
          row.textContent?.includes('Tienda barata'),
      );
    expect(offerRows[0]).toHaveTextContent('Tienda barata');
    expect(offerRows[1]).toHaveTextContent('Tienda de prueba');
  });
  it('confirms and deletes an offer from the table', async () => {
    getProductMock.mockResolvedValue(product);
    getBestOfferHistoryMock.mockResolvedValue({
      product: { id: product.id, name: product.name },
      current: null,
      baseline: null,
      history: [],
    });
    deletePublicationProductMock.mockResolvedValue(undefined);
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
    fireEvent.click(
      await screen.findByRole('button', { name: 'Eliminar oferta Tienda de prueba' }),
    );
    expect(screen.getByRole('heading', { name: '¿Eliminar oferta?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() =>
      expect(deletePublicationProductMock).toHaveBeenCalledWith(product.offers[0]!.id),
    );
  });

  it('opens the edit modal and reassigns the offer', async () => {
    getProductMock.mockResolvedValue(product);
    getBestOfferHistoryMock.mockResolvedValue({
      product: { id: product.id, name: product.name },
      current: null,
      baseline: null,
      history: [],
    });
    getProductOptionsMock.mockResolvedValue([
      { id: product.id, name: product.name, shortName: product.shortName },
      { id: '7d8c883c-7e36-4af0-a8b3-152b20c41f3c', name: 'Otro producto', shortName: 'Otro' },
    ]);
    reassignPublicationProductMock.mockResolvedValue(undefined);
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
    fireEvent.click(
      (await screen.findAllByRole('button', { name: 'Editar oferta Tienda de prueba' }))[0]!,
    );
    expect(screen.getByRole('heading', { name: 'Editar producto asociado' })).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: 'Producto asociado' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect(reassignPublicationProductMock).toHaveBeenCalledWith(product.offers[0]!.id, {
        productId: product.id,
      }),
    );
  });

  it('confirms product deletion from the edit modal', async () => {
    getProductMock.mockResolvedValue(product);
    getBestOfferHistoryMock.mockResolvedValue({
      product: { id: product.id, name: product.name },
      current: null,
      baseline: null,
      history: [],
    });
    deleteProductMock.mockResolvedValue(undefined);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/products/${product.id}`]}>
          <Routes>
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/" element={<p>Listado de productos</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /^editar$/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar producto' }));

    expect(screen.getByRole('heading', { name: '¿Eliminar producto?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(deleteProductMock).toHaveBeenCalledWith(product.id));
    expect(await screen.findByText('Listado de productos')).toBeInTheDocument();
  });
});
