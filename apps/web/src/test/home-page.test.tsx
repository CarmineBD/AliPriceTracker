import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getProducts } from '@/api/products.api';
import { ProductsPage } from '@/pages/products-page';

vi.mock('@/api/products.api', () => ({
  getProducts: vi.fn().mockResolvedValue({
    products: [],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  }),
  getProductOptions: vi.fn().mockResolvedValue([]),
  getProductComponents: vi.fn().mockResolvedValue([]),
  replaceProductComponents: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  uploadProductImage: vi.fn(),
  deleteProduct: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('ProductsPage', () => {
  it('renders the empty products state and creation action', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ProductsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Productos' })).toBeInTheDocument();
    expect(await screen.findByText('Aún no hay productos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar nuevo producto' })).toBeInTheDocument();
    expect(screen.getByText('0 resultados')).toBeInTheDocument();
  });

  it('requests the first page with the search text after a short debounce', async () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ProductsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(getProducts).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar productos' }), {
      target: { value: 'cable usb' },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(getProducts).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(getProducts).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, search: 'cable usb' });
  });
});
