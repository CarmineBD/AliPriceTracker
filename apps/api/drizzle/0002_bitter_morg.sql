CREATE TABLE "seller_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_available" integer NOT NULL,
	"max_purchase" integer NOT NULL,
	"url" text NOT NULL,
	"aliexpress_item_id" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160),
	"location" varchar(100),
	"review_score" numeric,
	"sales_count" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seller_products" ADD CONSTRAINT "seller_products_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_products" ADD CONSTRAINT "seller_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seller_products_product_id_idx" ON "seller_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "seller_products_seller_id_idx" ON "seller_products" USING btree ("seller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_products_aliexpress_item_id_unique" ON "seller_products" USING btree ("aliexpress_item_id");