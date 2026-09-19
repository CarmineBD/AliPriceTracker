import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PublicationProductChangesPage } from './publication-product-changes-page';

const { getPublicationProductChangesMock } = vi.hoisted(() => ({
  getPublicationProductChangesMock: vi.fn(),
}));

vi.mock('@/api/publication-product-changes.api', () => ({
  getPublicationProductChanges: getPublicationProductChangesMock,
}));

const firstPage = {
  changes: [
    {
      historyId: '00000000-0000-4000-8000-000000000001',
      publicationProductId: '00000000-0000-4000-8000-000000000002',
      changeType: 'price' as const,
      previousValue: '20.00',
      currentValue: '8.00',
      previousCurrency: 'EUR',
      currentCurrency: 'EUR',
      product: {
        id: '00000000-0000-4000-8000-000000000003',
        name: 'Producto de prueba',
        shortName: 'Producto corto',
        imageUrl: 'https://media.example.test/product.png',
      },
      storeName: 'Tienda de prueba',
      publicationUrl: 'https://example.com/publication',
      changedAt: new Date().toISOString(),
    },
    {
      historyId: '00000000-0000-4000-8000-000000000004',
      publicationProductId: '00000000-0000-4000-8000-000000000005',
      changeType: 'stock' as const,
      previousValue: 20,
      currentValue: 32,
      product: {
        id: '00000000-0000-4000-8000-000000000006',
        name: 'Segundo producto',
        shortName: 'Segundo corto',
        imageUrl: null,
      },
      storeName: 'Otra tienda',
      publicationUrl: null,
      changedAt: new Date().toISOString(),
    },
  ],
  pagination: { page: 1, pageSize: 20, total: 21, totalPages: 2 },
};

describe('PublicationProductChangesPage', () => {
  it('shows the latest change fields and can load the next page', async () => {
    getPublicationProductChangesMock.mockResolvedValueOnce(firstPage).mockResolvedValueOnce({
      ...firstPage,
      changes: [],
      pagination: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <PublicationProductChangesPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Últimos cambios' })).toBeInTheDocument();
    expect(await screen.findByText('Producto corto')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Imagen de Producto corto' })).toHaveAttribute(
      'src',
      'https://media.example.test/product.png',
    );
    expect(screen.getByText('Tienda de prueba')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://example.com/publication' })).toHaveAttribute(
      'href',
      'https://example.com/publication',
    );
    const priceRow = screen.getByRole('row', { name: /Producto corto/ });
    expect(priceRow).toHaveTextContent(/Precio: 8,00/);
    expect(priceRow).toHaveTextContent(/-12/);
    expect(priceRow.querySelectorAll('.text-emerald-700')).toHaveLength(2);
    const stockRow = screen.getByRole('row', { name: /Segundo corto/ });
    expect(stockRow).toHaveTextContent('Stock: 32');
    expect(stockRow).toHaveTextContent('+12');
    expect(stockRow.querySelectorAll('.text-emerald-700, .text-destructive')).toHaveLength(0);
    expect(screen.getAllByText(/^Hace \d+ segundos$/)).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Últimos cambios' })).toHaveAttribute(
      'href',
      '/publication-product-changes',
    );
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Imagen',
      'Nombre corto',
      'Tienda',
      'URL publicación',
      'Cambio',
      'Ejecutado hace',
    ]);

    await waitFor(() => {
      expect(getPublicationProductChangesMock).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));

    await waitFor(() => {
      expect(getPublicationProductChangesMock).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 });
    });
    expect(
      await screen.findByText('Aún no se han detectado cambios de precio ni de stock.'),
    ).toBeInTheDocument();
  });
});
