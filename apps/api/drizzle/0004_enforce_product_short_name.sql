-- Custom SQL migration file, put your code below! --
-- Existing products may predate the required short name. Preserve them by
-- using their full name, limited to the column's maximum length.
UPDATE "products"
SET "short_name" = LEFT("name", 80)
WHERE "short_name" IS NULL;

ALTER TABLE "products"
ALTER COLUMN "short_name" SET NOT NULL;
