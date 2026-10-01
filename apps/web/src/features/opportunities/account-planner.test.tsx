import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AccountPlanner } from './account-planner';

const opportunities = [
  {
    productId: 'product-1',
    imageUrl: null,
    name: 'Producto uno',
    shortName: 'Producto uno',
    basePurchasePrice: 100,
    currency: 'EUR',
    coupon: null,
    effectivePurchasePrice: 100,
    estimatedSellingPrice: 150,
    estimatedProfit: 50,
    roi: 50,
    nextCoupon: null,
    amountToNextCoupon: null,
    stock: 1,
    offerUrl: null,
    offerObservedAt: '2026-09-29T10:00:00.000Z',
  },
  {
    productId: 'product-2',
    imageUrl: null,
    name: 'Producto dos',
    shortName: 'Producto dos',
    basePurchasePrice: 100,
    currency: 'EUR',
    coupon: null,
    effectivePurchasePrice: 100,
    estimatedSellingPrice: 150,
    estimatedProfit: 50,
    roi: 50,
    nextCoupon: null,
    amountToNextCoupon: null,
    stock: 1,
    offerUrl: null,
    offerObservedAt: '2026-09-29T10:00:00.000Z',
  },
];

const coupons = [
  {
    id: 'coupon-1',
    minPurchase: 90,
    discountAmount: 10,
    category: 'event' as const,
  },
  {
    id: 'coupon-2',
    minPurchase: 90,
    discountAmount: 5,
    category: 'special' as const,
  },
];

afterEach(() => window.localStorage.clear());

describe('AccountPlanner', () => {
  it('uses each coupon only once per account and persists the account', () => {
    render(<AccountPlanner opportunities={opportunities} coupons={coupons} />);

    fireEvent.click(screen.getByRole('button', { name: 'Añadir cuenta' }));
    const productSearch = screen.getByRole('combobox', { name: 'Buscar producto para Cuenta 1' });
    const trigger = productSearch.parentElement?.querySelector('button');
    if (!trigger) throw new Error('No se encontró el disparador del buscador.');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: /Producto uno/ }));
    const secondProductSearch = screen.getByRole('combobox', {
      name: 'Buscar producto para Cuenta 1',
    });
    const secondTrigger = secondProductSearch.parentElement?.querySelector('button');
    if (!secondTrigger) throw new Error('No se encontró el disparador del buscador.');
    fireEvent.click(secondTrigger);
    fireEvent.click(screen.getByRole('option', { name: /Producto dos/ }));

    expect(screen.getByLabelText('Inversión total del planificador')).toHaveTextContent('185,00 €');
    expect(screen.getByLabelText('Beneficio total del planificador')).toHaveTextContent('115,00 €');
    expect(screen.getByText('ROI 62,2%')).toBeInTheDocument();
    expect(screen.getByText('2 de 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar cupón de Producto dos' }));
    fireEvent.click(screen.getByRole('button', { name: /Aplicar descuento de 10,00/ }));

    const firstProductRow = screen.getByText('Producto uno').closest('tr');
    const secondProductRow = screen.getByText('Producto dos').closest('tr');
    if (!firstProductRow || !secondProductRow) {
      throw new Error('No se encontraron las filas de productos.');
    }
    expect(within(firstProductRow).getByText('-5€')).toBeInTheDocument();
    expect(within(secondProductRow).getByText('-10€')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Producto uno de Cuenta 1' }));

    expect(screen.getByLabelText('Inversión total del planificador')).toHaveTextContent('90,00 €');
    expect(screen.getByLabelText('Beneficio total del planificador')).toHaveTextContent('60,00 €');
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
    const remainingProductRow = screen.getByText('Producto dos').closest('tr');
    if (!remainingProductRow) throw new Error('No se encontró la fila del producto restante.');
    expect(within(remainingProductRow).getByText('-10€')).toBeInTheDocument();
    expect(window.localStorage.getItem('alitracker.opportunities.account-planner.v1')).toContain(
      'product-2',
    );
  });

  it('lets the user change a row coupon from its clickable badge', () => {
    window.localStorage.setItem(
      'alitracker.opportunities.account-planner.v1',
      JSON.stringify({
        accounts: [
          {
            id: 'account-1',
            title: 'Cuenta manual',
            productIds: ['product-1'],
            couponByProductId: {},
          },
        ],
      }),
    );
    const alternativeCoupon = {
      id: 'coupon-3',
      minPurchase: 90,
      discountAmount: 6,
      category: 'special' as const,
    };

    render(<AccountPlanner opportunities={opportunities} coupons={[...coupons, alternativeCoupon]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar cupón de Producto uno' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Aplicar descuento de 6,00 € a Producto uno',
      }),
    );

    expect(screen.getByLabelText('Inversión total del planificador')).toHaveTextContent('94,00 €');
    expect(screen.getByLabelText('Beneficio total del planificador')).toHaveTextContent('56,00 €');
    expect(screen.getAllByLabelText('Descuento de -6€, cupón especial')).toHaveLength(2);
  });
});
