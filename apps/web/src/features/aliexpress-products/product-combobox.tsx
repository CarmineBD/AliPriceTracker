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

function getProductLabel(product: ProductOption): string {
  return product.shortName ? `${product.shortName} — ${product.name}` : product.name;
}

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
      itemToStringLabel={getProductLabel}
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
              {getProductLabel(option)}
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>No se encontraron productos.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
