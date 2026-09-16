import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ProductsPage } from '@/pages/products-page';

vi.mock('@/api/products.api', () => ({
  getProducts: vi.fn().mockResolvedValue({
    products: [],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  }),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  uploadProductImage: vi.fn(),
  deleteProduct: vi.fn(),
}));

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
    expect(await screen.findByText('Aún no hay productos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar nuevo producto' })).toBeInTheDocument();
  });
});
