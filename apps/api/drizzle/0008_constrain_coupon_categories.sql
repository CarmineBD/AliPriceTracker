ALTER TABLE "coupons"
ADD CONSTRAINT "coupons_category_allowed_values"
CHECK ("category" IS NULL OR "category" IN ('event', 'special'));
