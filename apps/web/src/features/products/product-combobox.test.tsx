import { render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ProductCombobox } from './product-combobox';

const comboboxMock = vi.hoisted(() => ({ items: [] as Array<{ id: string }> }));

vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({ items, children }: { items: Array<{ id: string }>; children: ReactNode }) => {
    comboboxMock.items = items;
    return <div>{children}</div>;
  },
  ComboboxContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ComboboxEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ComboboxInput: (props: ComponentProps<'input'>) => <input {...props} />,
  ComboboxItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ComboboxList: ({ children }: { children: (item: { id: string }) => ReactNode }) => (
    <div>{comboboxMock.items.map(children)}</div>
  ),
}));

const options = [
  {
    id: '9f98dbb8-99f6-4058-96f0-9577322cffdb',
    name: 'Cafetera espresso compacta',
    shortName: 'Cafetera',
    imageUrl: 'https://media.example.test/products/coffee-maker.png',
  },
  {
    id: '9ceaa3f1-6d2c-4405-8414-323045d94219',
    name: 'Molinillo de café eléctrico',
    shortName: 'Molinillo',
    imageUrl: null,
  },
];

describe('ProductCombobox', () => {
  it('shows product thumbnails in its options using the component-table size', () => {
    render(
      <ProductCombobox
        options={options}
        onProductIdChange={vi.fn()}
        ariaLabel="Producto contenido"
      />,
    );

    const image = screen.getByAltText('Imagen de Cafetera');
    expect(image).toHaveAttribute('src', options[0]!.imageUrl);
    expect(image).toHaveClass('size-10');
    expect(screen.getByLabelText('Sin imagen para Molinillo')).toBeInTheDocument();
  });
});
