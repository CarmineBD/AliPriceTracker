CREATE TABLE IF NOT EXISTS "coupons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "min_purchase" numeric(12, 2) NOT NULL,
  "discount_amount" numeric(12, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(160) NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "events_ends_at_after_starts_at" CHECK ("ends_at" > "starts_at")
);

CREATE TABLE IF NOT EXISTS "event_coupons" (
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "coupon_id" uuid NOT NULL REFERENCES "coupons"("id") ON DELETE CASCADE,
  CONSTRAINT "event_coupons_pkey" PRIMARY KEY ("event_id", "coupon_id")
);

-- `ends_at` is first because, for a current-time query, completed events are normally the largest
-- excluded set. `starts_at` then filters out events that have not yet begun.
CREATE INDEX IF NOT EXISTS "events_ends_at_starts_at_idx"
ON "events" ("ends_at", "starts_at");

-- The primary key already indexes event_id for event -> coupons lookups. This supports FK cascades
-- and any future coupon -> events lookup without scanning the join table.
CREATE INDEX IF NOT EXISTS "event_coupons_coupon_id_idx"
ON "event_coupons" ("coupon_id");
