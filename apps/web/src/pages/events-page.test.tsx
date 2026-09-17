import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { EventsPage } from './events-page';

const { getCouponsMock, getEventsMock, getCouponOptionsMock } = vi.hoisted(() => ({
  getCouponsMock: vi.fn(),
  getEventsMock: vi.fn(),
  getCouponOptionsMock: vi.fn(),
}));

vi.mock('@/api/events.api', () => ({
  getCoupons: getCouponsMock,
  getEvents: getEventsMock,
  getCouponOptions: getCouponOptionsMock,
  createCoupon: vi.fn(),
  updateCoupon: vi.fn(),
  deleteCoupon: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

describe('EventsPage', () => {
  it('shows paginated coupon and event management tables', async () => {
    getCouponsMock.mockResolvedValue({
      coupons: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          minPurchase: 79,
          discountAmount: 10,
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getEventsMock.mockResolvedValue({
      events: [
        {
          id: '00000000-0000-4000-8000-000000000002',
          name: '11.11 2026',
          startsAt: '2026-11-11T00:00:00.000Z',
          endsAt: '2026-11-12T00:00:00.000Z',
          coupons: [],
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getCouponOptionsMock.mockResolvedValue([]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <EventsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Eventos y cupones' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cupones' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Eventos' })).toBeInTheDocument();
    expect(await screen.findByText('11.11 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar cupón' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar evento' })).toBeInTheDocument();
  });
});
