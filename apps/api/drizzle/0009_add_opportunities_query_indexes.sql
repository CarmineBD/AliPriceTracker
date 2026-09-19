CREATE INDEX IF NOT EXISTS "publication_products_product_id_index"
ON "publication_products" ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_best_offer_history_current_lookup_index"
ON "product_best_offer_history" ("product_id", "captured_at" DESC, "id" DESC);
