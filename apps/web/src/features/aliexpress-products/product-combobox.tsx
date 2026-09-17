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
  disabled?: boolean;
  ariaLabel?: string;
  placeholder?: string;
};

function getProductLabel(product: ProductOption): string {
  return product.shortName;
}

export function ProductCombobox({
  options,
  productId,
  onProductIdChange,
  invalid = false,
  disabled = false,
  ariaLabel = 'Producto asociado',
  placeholder = 'Seleccionar producto...',
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
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxList>
          {(option: ProductOption) => (
            <ComboboxItem key={option.id} value={option}>
              <span className="flex min-w-0 flex-col items-start">
                <span>{getProductLabel(option)}</span>
                <span className="text-xs text-muted-foreground">{option.name}</span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>No se encontraron productos.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
