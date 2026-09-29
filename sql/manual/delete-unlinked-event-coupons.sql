BEGIN;

DELETE FROM coupons AS coupon
WHERE coupon.category = 'event'
  AND NOT EXISTS (
    SELECT 1
    FROM event_coupons AS event_coupon
    WHERE event_coupon.coupon_id = coupon.id
  );

COMMIT;
