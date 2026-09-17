import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPublicationProductHistory } from '@/api/publication-product-history.api';

import { PublicationProductHistoryDialog } from './publication-product-history-dialog';

vi.mock('@/api/publication-product-history.api', () => ({
  getPublicationProductHistory: vi.fn(),
}));

const mockedGetPublicationProductHistory = vi.mocked(getPublicationProductHistory);
const publicationProductId = '2f77ec40-2d60-4a7e-a0cf-d93a4728b1de';

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PublicationProductHistoryDialog
        publicationProductId={publicationProductId}
        productName="Lito X1"
        aliexpressSkuId="12000058446755029"
      />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('PublicationProductHistoryDialog', () => {
  it('sends the expected from value when the time filter changes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T12:00:00.000Z'));
    mockedGetPublicationProductHistory.mockResolvedValue({
      publicationProduct: {
        id: publicationProductId,
        publicationId: '9ceaa3f1-6d2c-4405-8414-323045d94219',
        productId: '9f7d2e8f-1781-411a-b74a-7923d9a83ea1',
        aliexpressSkuId: '12000058446755029',
        current: { price: '591.70', currency: 'EUR', quantityAvailable: 17 },
        lastCheckedAt: '2026-09-17T09:00:00.000Z',
      },
      baseline: null,
      history: [],
    });
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Ver histórico' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedGetPublicationProductHistory).toHaveBeenLastCalledWith(publicationProductId, {
      from: '2026-09-10T12:00:00.000Z',
    });

    fireEvent.click(screen.getByRole('button', { name: '24h' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedGetPublicationProductHistory).toHaveBeenLastCalledWith(publicationProductId, {
      from: '2026-09-16T12:00:00.000Z',
    });

    fireEvent.click(screen.getByRole('button', { name: '30d' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedGetPublicationProductHistory).toHaveBeenLastCalledWith(publicationProductId, {
      from: '2026-08-18T12:00:00.000Z',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Todo' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedGetPublicationProductHistory).toHaveBeenLastCalledWith(publicationProductId, {});
  });

  it('shows a readable error when the history request fails', async () => {
    mockedGetPublicationProductHistory.mockRejectedValue(new Error('network'));
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Ver histórico' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el histórico.');
  });
});
