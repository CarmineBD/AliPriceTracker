ALTER TABLE "coupons"
ADD COLUMN IF NOT EXISTS "category" varchar(50);

UPDATE "coupons"
SET "category" = 'event'
WHERE "category" IS NULL;
