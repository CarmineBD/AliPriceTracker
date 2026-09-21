import type { ProductOption } from '@alitracker/shared';
import { ImageOff } from 'lucide-react';

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
  autoFocus?: boolean;
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
  autoFocus = false,
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
        autoFocus={autoFocus}
      />
      <ComboboxContent>
        <ComboboxList>
          {(option: ProductOption) => (
            <ComboboxItem key={option.id} value={option}>
              {option.imageUrl ? (
                <img
                  src={option.imageUrl}
                  alt={`Imagen de ${getProductLabel(option)}`}
                  className="size-10 shrink-0 rounded-md border object-cover"
                />
              ) : (
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                  aria-label={`Sin imagen para ${getProductLabel(option)}`}
                >
                  <ImageOff className="size-4" />
                </span>
              )}
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
