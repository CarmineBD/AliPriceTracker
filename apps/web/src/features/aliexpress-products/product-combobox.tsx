import type { ProductOption } from '@alitracker/shared';

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';

type ProductComboboxProps = {
  options: ProductOption[];
  productId?: string;
  onProductIdChange: (productId: string | undefined) => void;
  invalid?: boolean;
};

export function ProductCombobox({
  options,
  productId,
  onProductIdChange,
  invalid = false,
}: ProductComboboxProps) {
  const selectedProduct = options.find((option) => option.id === productId) ?? null;

  return (
    <Combobox
      items={options}
      value={selectedProduct}
      onValueChange={(product) => onProductIdChange(product?.id)}
      itemToStringLabel={(product) => product.shortName ?? 'Sin nombre corto'}
      itemToStringValue={(product) => product.id}
    >
      <ComboboxInput
        placeholder="Seleccionar producto..."
        aria-label="Producto asociado"
        aria-invalid={invalid || undefined}
      />
      <ComboboxContent>
        <ComboboxList>
          {(option: ProductOption) => (
            <ComboboxItem key={option.id} value={option}>
              {option.shortName ?? 'Sin nombre corto'}
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>No se encontraron productos.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
