import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAliExpressProduct } from '@/api/aliexpress-products.api';
import { AliExpressProductSearchPage } from '@/pages/aliexpress-product-search-page';

vi.mock('@/api/aliexpress-products.api', () => ({
  getAliExpressProduct: vi.fn(),
}));

const mockedGetAliExpressProduct = vi.mocked(getAliExpressProduct);

describe('AliExpressProductSearchPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('searches a publication and displays each returned variant', async () => {
    mockedGetAliExpressProduct.mockResolvedValue({
      productId: '1005010519851506',
      productName: 'Dron de prueba',
      products: [
        {
          id: 'sku-1',
          variantName: 'DJI Neo2 Combo-Only Drone',
          price: '205,96€',
          quantityAvailable: 222,
          imageUrl: 'https://example.test/drone.jpg',
          salable: true,
        },
      ],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <AliExpressProductSearchPage />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('ID de publicación de AliExpress'), {
      target: { value: '1005010519851506' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByRole('heading', { name: 'Dron de prueba' })).toBeInTheDocument();
    expect(screen.getByText('DJI Neo2 Combo-Only Drone')).toBeInTheDocument();
    expect(screen.getByText('sku-1')).toBeInTheDocument();
    expect(screen.getByText('205,96€')).toBeInTheDocument();
    expect(screen.getByText('222')).toBeInTheDocument();
    expect(mockedGetAliExpressProduct).toHaveBeenCalledWith('1005010519851506');
  });

  it('does not make a request for a non-numeric identifier', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <AliExpressProductSearchPage />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('ID de publicación de AliExpress'), {
      target: { value: 'abc-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Introduce un ID de publicación numérico.');
    expect(mockedGetAliExpressProduct).not.toHaveBeenCalled();
  });
});
