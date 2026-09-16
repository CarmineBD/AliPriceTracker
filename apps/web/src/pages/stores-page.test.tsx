import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { getStores } from '@/api/stores.api';
import { StoresPage } from '@/pages/stores-page';

vi.mock('@/api/stores.api', () => ({
  getStores: vi.fn(),
}));

const mockedGetStores = vi.mocked(getStores);

describe('StoresPage', () => {
  it('shows each store and its publication count', async () => {
    mockedGetStores.mockResolvedValue([
      {
        id: '9f98dbb8-99f6-4058-96f0-9577322cffdb',
        aliexpressStoreId: '1105347613',
        name: 'Tienda Marco Europa',
        location: 'España',
        reviewScore: 4.9,
        sales180d: '4.000+',
        publicationsCount: 3,
      },
    ]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <StoresPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Tiendas' })).toBeInTheDocument();
    expect(await screen.findByText('Tienda Marco Europa')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tienda Marco Europa' })).toHaveAttribute(
      'href',
      '/stores/9f98dbb8-99f6-4058-96f0-9577322cffdb',
    );
    expect(screen.getByText('España')).toBeInTheDocument();
    expect(screen.getByText('4.000+')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument();
  });
});
