import type { ProductCombo } from '@alitracker/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProductComponentsEditor } from './product-components-editor';

afterEach(cleanup);

const component: ProductCombo = {
  productId: '8d8c883c-7e36-4af0-a8b3-152b20c41f3c',
  containsProductId: '6bf23e18-2a68-4b08-91fb-4d0988620d6c',
  quantity: 1,
  product: {
    id: '6bf23e18-2a68-4b08-91fb-4d0988620d6c',
    name: 'Producto incluido',
    shortName: 'Incluido',
    imageKey: null,
    imageUrl: null,
    averageSellingPrice: null,
    effectiveSellingPrice: null,
  },
};

describe('ProductComponentsEditor', () => {
  it('shows quantity 1 by default and lets the user update it', () => {
    const onChange = vi.fn();

    render(
      <ProductComponentsEditor
        productId={component.productId}
        components={[component]}
        options={[]}
        optionsLoading={false}
        disabled={false}
        onChange={onChange}
      />,
    );

    const quantityInput = screen.getByRole('spinbutton', { name: 'Cantidad de Incluido' });
    expect(quantityInput).toHaveValue(1);

    fireEvent.change(quantityInput, { target: { value: '3' } });

    expect(onChange).toHaveBeenCalledWith([{ ...component, quantity: 3 }]);
  });
});
