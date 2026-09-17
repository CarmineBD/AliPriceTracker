BEGIN;

ALTER TABLE public.products
  ALTER COLUMN average_selling_price DROP NOT NULL;

CREATE TABLE public.product_combos (
  product_id uuid NOT NULL,
  contains_product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  CONSTRAINT product_combos_product_id_contains_product_id_unique
    UNIQUE (product_id, contains_product_id),
  CONSTRAINT product_combos_quantity_positive
    CHECK (quantity > 0),
  CONSTRAINT product_combos_no_self_reference
    CHECK (product_id <> contains_product_id),
  CONSTRAINT product_combos_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT product_combos_contains_product_id_fkey
    FOREIGN KEY (contains_product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

CREATE INDEX product_combos_contains_product_id_idx
  ON public.product_combos (contains_product_id);

COMMIT;
