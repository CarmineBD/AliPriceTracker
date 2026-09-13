import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomePage } from '@/pages/home-page';

vi.mock('@/api/health.api', () => ({
  getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
}));

describe('HomePage', () => {
  it('renders the application name', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <HomePage />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'AliTracker' })).toBeInTheDocument();
    expect(await screen.findByText('API connected')).toBeInTheDocument();
  });
});
