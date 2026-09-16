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
      value={selectedProduct}
      onValueChange={(product) => onProductIdChange(product?.id)}
      itemToStringLabel={(product) => product.name}
    >
      <ComboboxInput
        placeholder="Seleccionar producto..."
        aria-label="Producto asociado"
        aria-invalid={invalid || undefined}
      />
      <ComboboxContent>
        <ComboboxList>
          {options.map((option) => (
            <ComboboxItem key={option.id} value={option}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{option.name}</span>
                {option.shortName && (
                  <span className="truncate text-xs text-muted-foreground">{option.shortName}</span>
                )}
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
        <ComboboxEmpty>No se encontraron productos.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
