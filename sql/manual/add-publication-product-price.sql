ALTER TABLE public.publication_products
    ADD COLUMN IF NOT EXISTS price numeric(12,2),
    ADD COLUMN IF NOT EXISTS currency varchar(3);
