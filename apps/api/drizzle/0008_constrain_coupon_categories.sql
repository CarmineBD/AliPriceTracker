DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coupons_category_allowed_values'
      AND conrelid = 'public.coupons'::regclass
  ) THEN
    ALTER TABLE "coupons"
    ADD CONSTRAINT "coupons_category_allowed_values"
    CHECK ("category" IS NULL OR "category" IN ('event', 'special'));
  END IF;
END
$$;
