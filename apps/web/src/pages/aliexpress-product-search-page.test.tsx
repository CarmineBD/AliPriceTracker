import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  importAliExpressPublication,
  type ImportAliExpressPublicationPayload,
} from '@/api/aliexpress-publications.api';
import { getAliExpressProduct } from '@/api/aliexpress-products.api';
import { ApiError } from '@/api/client';
import { getProductOptions } from '@/api/products.api';
import { AliExpressProductSearchPage } from '@/pages/aliexpress-product-search-page';

vi.mock('@/api/aliexpress-products.api', () => ({
  getAliExpressProduct: vi.fn(),
}));

vi.mock('@/api/aliexpress-publications.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/aliexpress-publications.api')>();
  return { ...actual, importAliExpressPublication: vi.fn() };
});

vi.mock('@/api/products.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/products.api')>();
  return { ...actual, getProductOptions: vi.fn() };
});

vi.mock('@/features/aliexpress-products/product-combobox', () => ({
  ProductCombobox: ({
    options,
    productId,
    onProductIdChange,
  }: {
    options: Array<{ id: string; name: string }>;
    productId?: string;
    onProductIdChange: (productId: string | undefined) => void;
  }) => (
    <select
      aria-label="Producto asociado"
      value={productId ?? ''}
      onChange={(event) => onProductIdChange(event.target.value || undefined)}
    >
      <option value="">Seleccionar producto...</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  ),
}));

const mockedGetAliExpressProduct = vi.mocked(getAliExpressProduct);
const mockedGetProductOptions = vi.mocked(getProductOptions);
const mockedImportAliExpressPublication = vi.mocked(importAliExpressPublication);

const productOne = { id: '9f98dbb8-99f6-4058-96f0-9577322cffdb', name: 'DJI Lito X1', shortName: null };
const productTwo = {
  id: '9ceaa3f1-6d2c-4405-8414-323045d94219',
  name: 'DJI Lito X1 Fly More',
  shortName: 'Fly More',
};

const preview = {
  store: {
    aliexpressStoreId: '1105347613',
    name: 'Tienda Marco Europa',
    location: 'España',
    reviewScore: 4.9,
    sales180d: '4,000+',
  },
  publication: {
    aliexpressProductId: '1005012470064491',
    name: 'DJI Lito X1',
    url: 'https://www.aliexpress.com/item/1005012470064491.html',
    salesCount: '97',
    reviewScore: 4.6,
    reviewCount: 10,
  },
  productId: '1005012470064491',
  productName: 'DJI Lito X1',
  products: [
    {
      aliexpressSkuId: '12000058446755029',
      id: '12000058446755029',
      variantName: 'DJI Lito X1 Combo RC2',
      price: '591,70€',
      quantityAvailable: 17,
      maxPurchase: 1,
      imageUrl: 'https://example.test/rc2.jpg',
      salable: true,
    },
    {
      aliexpressSkuId: '12000058446755028',
      id: '12000058446755028',
      variantName: 'DJI Lito X1 Combo RC-N3',
      price: '539,32€',
      quantityAvailable: 1,
      maxPurchase: 1,
      imageUrl: 'https://example.test/rc-n3.jpg',
      salable: false,
    },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AliExpressProductSearchPage />
    </QueryClientProvider>,
  );
}

async function searchPublication(id = '1005012470064491') {
  fireEvent.change(screen.getByLabelText('ID de publicación AliExpress'), { target: { value: id } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  await screen.findByRole('heading', { name: 'Vista previa de la publicación' });
}

function associateVariant(index: number, productId: string) {
  const inputs = screen.getAllByLabelText('Producto asociado');
  fireEvent.change(inputs[index]!, { target: { value: productId } });
}

describe('AliExpressProductSearchPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('searches a publication and displays its store, details, and every SKU', async () => {
    mockedGetAliExpressProduct.mockResolvedValue(preview);
    mockedGetProductOptions.mockResolvedValue([productOne, productTwo]);

    renderPage();
    await searchPublication();

    expect(screen.getByText('Tienda Marco Europa')).toBeInTheDocument();
    expect(screen.getByText('DJI Lito X1 Combo RC2')).toBeInTheDocument();
    expect(screen.getByText('DJI Lito X1 Combo RC-N3')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByText('No disponible')).toBeInTheDocument();
    expect(mockedGetAliExpressProduct).toHaveBeenCalledWith('1005012470064491');
  });

  it('keeps the import button disabled while variants have no associated product', async () => {
    mockedGetAliExpressProduct.mockResolvedValue(preview);
    mockedGetProductOptions.mockResolvedValue([productOne, productTwo]);

    renderPage();
    await searchPublication();

    expect(screen.getByRole('button', { name: 'Añadir al sistema' })).toBeDisabled();
    expect(
      screen.getByText('Debes asociar un producto a todas las variantes antes de continuar.'),
    ).toBeInTheDocument();
  });

  it('associates each SKU independently and sends the phase-2 payload', async () => {
    mockedGetAliExpressProduct.mockResolvedValue(preview);
    mockedGetProductOptions.mockResolvedValue([productOne, productTwo]);
    mockedImportAliExpressPublication.mockResolvedValue({
      success: true,
      message: 'Publicación importada correctamente.',
      store: { id: 'store-id', aliexpressStoreId: '1105347613', created: true },
      publication: { id: 'publication-id', aliexpressProductId: '1005012470064491' },
      publicationProducts: [],
    });

    renderPage();
    await searchPublication();
    associateVariant(0, productOne.id);
    associateVariant(1, productTwo.id);

    const importButton = screen.getByRole('button', { name: 'Añadir al sistema' });
    await waitFor(() => expect(importButton).toBeEnabled());
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(mockedImportAliExpressPublication.mock.calls[0]?.[0]).toEqual({
        store: preview.store,
        publication: preview.publication,
        products: [
          {
            aliexpressSkuId: '12000058446755029',
            productId: productOne.id,
            quantityAvailable: 17,
            maxPurchase: 1,
          },
          {
            aliexpressSkuId: '12000058446755028',
            productId: productTwo.id,
            quantityAvailable: 1,
            maxPurchase: 1,
          },
        ],
      } satisfies ImportAliExpressPublicationPayload);
    });
  });

  it('shows backend conflicts in an alert dialog', async () => {
    mockedGetAliExpressProduct.mockResolvedValue(preview);
    mockedGetProductOptions.mockResolvedValue([productOne, productTwo]);
    mockedImportAliExpressPublication.mockRejectedValue(
      new ApiError(
        'La publicación de AliExpress 1005012470064491 ya está registrada en el sistema.',
        409,
        'PUBLICATION_ALREADY_EXISTS',
      ),
    );

    renderPage();
    await searchPublication();
    associateVariant(0, productOne.id);
    associateVariant(1, productTwo.id);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir al sistema' }));

    expect(await screen.findByText('No se pudo añadir la publicación')).toBeInTheDocument();
    expect(
      screen.getByText('La publicación de AliExpress 1005012470064491 ya está registrada en el sistema.'),
    ).toBeInTheDocument();
  });

  it('shows missing product IDs returned by the backend', async () => {
    mockedGetAliExpressProduct.mockResolvedValue(preview);
    mockedGetProductOptions.mockResolvedValue([productOne, productTwo]);
    mockedImportAliExpressPublication.mockRejectedValue(
      new ApiError('Uno o más productos no existen en el sistema.', 422, 'PRODUCTS_NOT_FOUND', {
        missingProductIds: [productOne.id],
      }),
    );

    renderPage();
    await searchPublication();
    associateVariant(0, productOne.id);
    associateVariant(1, productTwo.id);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir al sistema' }));

    expect(await screen.findByText(/Productos no encontrados:/)).toHaveTextContent(productOne.id);
  });

  it('resets associations when searching for another publication', async () => {
    mockedGetAliExpressProduct
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({
        ...preview,
        publication: { ...preview.publication, aliexpressProductId: '1005012470064492' },
        productId: '1005012470064492',
      });
    mockedGetProductOptions.mockResolvedValue([productOne, productTwo]);

    renderPage();
    await searchPublication();
    associateVariant(0, productOne.id);
    fireEvent.change(screen.getByLabelText('ID de publicación AliExpress'), {
      target: { value: '1005012470064492' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await screen.findByText('1005012470064492');
    expect(screen.getByRole('button', { name: 'Añadir al sistema' })).toBeDisabled();
  });

  it('clears the page after a successful import', async () => {
    mockedGetAliExpressProduct.mockResolvedValue(preview);
    mockedGetProductOptions.mockResolvedValue([productOne, productTwo]);
    mockedImportAliExpressPublication.mockResolvedValue({
      success: true,
      message: 'Publicación importada correctamente.',
      store: { id: 'store-id', aliexpressStoreId: '1105347613', created: true },
      publication: { id: 'publication-id', aliexpressProductId: '1005012470064491' },
      publicationProducts: [],
    });

    renderPage();
    await searchPublication();
    associateVariant(0, productOne.id);
    associateVariant(1, productTwo.id);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir al sistema' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Vista previa de la publicación' })).toBeNull();
    });
    expect(screen.getByLabelText('ID de publicación AliExpress')).toHaveValue('');
  });

  it('does not make a request for a non-numeric identifier', () => {
    mockedGetProductOptions.mockResolvedValue([]);
    renderPage();

    fireEvent.change(screen.getByLabelText('ID de publicación AliExpress'), {
      target: { value: 'abc-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Introduce un ID de publicación numérico.');
    expect(mockedGetAliExpressProduct).not.toHaveBeenCalled();
  });
});
