import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getProductBestOfferHistory } from '@/api/product-best-offer-history.api';

import { ProductBestOfferHistoryDialog } from './product-best-offer-history-dialog';

vi.mock('@/api/product-best-offer-history.api', () => ({ getProductBestOfferHistory: vi.fn() }));
const getHistoryMock = vi.mocked(getProductBestOfferHistory);
const productId = '9f7d2e8f-1781-411a-b74a-7923d9a83ea1';

function renderDialog() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ProductBestOfferHistoryDialog productId={productId} productName="DJI Neo 2" />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.clearAllMocks());

describe('ProductBestOfferHistoryDialog', () => {
  it('loads lazily and shows the current offer with its protected purchase link', async () => {
    getHistoryMock.mockResolvedValue({
      product: { id: productId, name: 'DJI Neo 2' },
      baseline: null,
      history: [],
      current: {
        id: '1f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
        isAvailable: true,
        publicationProductId: '2f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
        price: '199.99',
        currency: 'EUR',
        quantityAvailable: 30,
        publicationUrl: 'https://example.com/buy',
        capturedAt: '2026-09-20T10:00:00.000Z',
      },
    });
    renderDialog();
    expect(getHistoryMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ver histórico de mejor precio' }));
    const link = await screen.findByRole('link', { name: 'Comprar en AliExpress' });
    expect(screen.getByText(/Precio actual mínimo:/).parentElement).toHaveTextContent('199,99');
    expect(link).toHaveAttribute('href', 'https://example.com/buy');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows unavailable state without a purchase link', async () => {
    getHistoryMock.mockResolvedValue({
      product: { id: productId, name: 'DJI Neo 2' },
      current: {
        id: '1f77ec40-2d60-4a7e-a0cf-d93a4728b1de',
        isAvailable: false,
        publicationProductId: null,
        price: null,
        currency: null,
        quantityAvailable: null,
        publicationUrl: null,
        capturedAt: '2026-09-20T10:00:00.000Z',
      },
      baseline: null,
      history: [],
    });
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Ver histórico de mejor precio' }));
    expect(
      await screen.findByText('Actualmente no hay ninguna oferta disponible.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comprar en AliExpress' })).not.toBeInTheDocument();
  });
});
