CREATE TABLE IF NOT EXISTS "product_best_offer_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "publication_product_id" uuid REFERENCES "publication_products"("id") ON DELETE SET NULL,
  "price" numeric(12, 2),
  "currency" varchar(3),
  "quantity_available" integer,
  "publication_url" text,
  "is_available" boolean NOT NULL,
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "product_best_offer_history_product_captured_at_index"
ON "product_best_offer_history" ("product_id", "captured_at");
