CREATE UNIQUE INDEX "publication_products_product_id_id_unique"
ON "publication_products" USING btree ("product_id", "id");--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"total_final_price" numeric(12, 2) NOT NULL,
	"status" varchar(16) NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_status_allowed_values" CHECK ("purchases"."status" IN ('ordered', 'received', 'returned')),
	CONSTRAINT "purchases_product_offer_matches_publication_product_fk" FOREIGN KEY ("product_id","offer_id") REFERENCES "public"."publication_products"("product_id","id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "purchases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "purchases_offer_id_publication_products_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."publication_products"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"total_sale_price" numeric(12, 2) NOT NULL,
	"status" varchar(16) NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_status_allowed_values" CHECK ("sales"."status" IN ('to_be_sent', 'sent', 'completed')),
	CONSTRAINT "sales_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "purchases_product_id_idx" ON "purchases" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "purchases_offer_id_idx" ON "purchases" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "purchases_date_idx" ON "purchases" USING btree ("date");--> statement-breakpoint
CREATE INDEX "sales_product_id_idx" ON "sales" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sales_date_idx" ON "sales" USING btree ("date");
