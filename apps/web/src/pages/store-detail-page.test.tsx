import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { getStore } from '@/api/stores.api';
import { StoreDetailPage } from '@/pages/store-detail-page';

vi.mock('@/api/stores.api', () => ({
  getStore: vi.fn(),
}));

const mockedGetStore = vi.mocked(getStore);

const store = {
  id: '9f98dbb8-99f6-4058-96f0-9577322cffdb',
  aliexpressStoreId: '1105347613',
  name: 'Tienda Marco Europa',
  location: 'España',
  reviewScore: 4.9,
  sales180d: '4.000+',
  publicationsCount: 1,
  publications: [
    {
      id: '9ceaa3f1-6d2c-4405-8414-323045d94219',
      aliexpressProductId: '1005012470064491',
      name: 'DJI Lito X1',
      url: 'https://www.aliexpress.com/item/1005012470064491.html',
      salesCount: '97',
      reviewScore: 4.6,
      reviewCount: 10,
      products: [
        {
          id: '2f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
          productId: '9f7d2e8f-1781-411a-b74a-7923d9a83ea1',
          productName: 'DJI Lito X1',
          productShortName: 'Lito X1',
          aliexpressSkuId: '12000058446755029',
          price: '591.70',
          currency: 'EUR',
          quantityAvailable: 17,
          maxPurchase: 1,
        },
      ],
    },
  ],
};

describe('StoreDetailPage', () => {
  it('shows the store, its publications, and the associated products', async () => {
    mockedGetStore.mockResolvedValue(store);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/stores/${store.id}`]}>
          <Routes>
            <Route path="/stores/:id" element={<StoreDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: store.name })).toBeInTheDocument();
    expect(mockedGetStore).toHaveBeenCalledWith(store.id);
    expect(screen.getByRole('heading', { name: 'Publicaciones (1)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'DJI Lito X1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Productos disponibles (1)' })).toBeInTheDocument();
    expect(screen.getByText('12000058446755029')).toBeInTheDocument();
    expect(screen.getByText('591.70 EUR')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver en AliExpress' })).toHaveAttribute(
      'href',
      'https://www.aliexpress.com/item/1005012470064491.html',
    );
  });
});
