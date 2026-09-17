-- Migration: make_payments_ticketid_nullable
-- Makes payments.ticketId nullable since new time-slot orders link via orderId instead

-- Drop the existing NOT NULL constraint on ticketId
ALTER TABLE "payments"
  ALTER COLUMN "ticketId" DROP NOT NULL;

-- For payments with NULL orderId but valid ticketId, link them to an Order
-- Create a default order for each orphaned payment (one Order per payment)
INSERT INTO "orders" (
  "id", "userId", "eventId", "reservationId",
  "totalAmount", "currency", "discountAmount", "promoCodeId",
  "createdAt", "updatedAt"
)
SELECT
  'c' || encode(gen_random_bytes(16), 'hex') AS "id",
  p."userId",
  p."eventId",
  NULL AS "reservationId",
  p."amount",
  p."currency",
  0 AS "discountAmount",
  NULL AS "promoCodeId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "payments" p
WHERE p."orderId" IS NULL AND p."ticketId" IS NOT NULL;

-- Link those payments to their newly created orders by ticketId → ticket → order
UPDATE "payments" p
SET "orderId" = (
  SELECT o."id"
  FROM "orders" o
  WHERE o."userId" = p."userId"
    AND o."eventId" = p."eventId"
    AND o."createdAt" >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
  LIMIT 1
)
WHERE p."orderId" IS NULL AND p."ticketId" IS NOT NULL;

-- Now make orderId NOT NULL
ALTER TABLE "payments"
  ALTER COLUMN "orderId" SET NOT NULL;
