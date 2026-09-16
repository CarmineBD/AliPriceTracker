ALTER TABLE "publications"
ADD COLUMN IF NOT EXISTS "last_checked_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "publication_product_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "publication_product_id" uuid NOT NULL REFERENCES "publication_products"("id") ON DELETE CASCADE,
  "price" numeric(12, 2),
  "currency" varchar(3),
  "quantity_available" integer,
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "publication_product_history_product_captured_at_index"
ON "publication_product_history" ("publication_product_id", "captured_at");
