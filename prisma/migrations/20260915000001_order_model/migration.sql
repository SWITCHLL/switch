-- Migration: order_model
-- Introduces the Order model as the anchor for multi-ticket checkouts.
-- Payment now links to Order (1:1) instead of Ticket (1:1).
-- Ticket gets an orderId FK (nullable for backward compat).
-- RefundRequest gains a nullable ticketId for per-ticket partial refunds.

-- ─── CreateTable: orders ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "orders" (
    "id"             TEXT        NOT NULL,
    "userId"         TEXT        NOT NULL,
    "eventId"        TEXT        NOT NULL,
    "reservationId"  TEXT,
    "totalAmount"    INTEGER     NOT NULL,
    "currency"       TEXT        NOT NULL DEFAULT 'NGN',
    "discountAmount" INTEGER     NOT NULL DEFAULT 0,
    "promoCodeId"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- Unique: one Order per Reservation
CREATE UNIQUE INDEX IF NOT EXISTS "orders_reservationId_key" ON "orders"("reservationId");

-- Indexes
CREATE INDEX IF NOT EXISTS "orders_userId_idx"   ON "orders"("userId");
CREATE INDEX IF NOT EXISTS "orders_eventId_idx"  ON "orders"("eventId");

-- Foreign keys
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_promoCodeId_fkey"
  FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── AlterTable: payments — swap ticketId for orderId ─────────────────────────

-- 1. Add the new orderId column (nullable to avoid breaking existing rows)
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "orderId" TEXT;

-- 2. Remove the old per-ticket promo code columns (now on Order)
--    These are nullable so dropping is safe with no existing data.
ALTER TABLE "payments"
  DROP COLUMN IF EXISTS "promoCodeId",
  DROP COLUMN IF EXISTS "discountAmount";

-- 3. Create the unique index for orderId (once data is back-filled this should be NOT NULL,
--    but we allow NULL here for migration safety; application code enforces uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS "payments_orderId_key" ON "payments"("orderId");

-- 4. Add FK for orderId → orders
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- NOTE: "ticketId" column and its FK are left in place intentionally.
-- They will be removed in a follow-up migration after confirming no active
-- data depends on them. For now, new payments use orderId; old payments
-- retain their ticketId for audit trail continuity.

-- ─── AlterTable: tickets — add orderId ───────────────────────────────────────

ALTER TABLE "tickets"
  ADD COLUMN IF NOT EXISTS "orderId" TEXT;

-- Index for order → tickets lookup
CREATE INDEX IF NOT EXISTS "tickets_orderId_idx" ON "tickets"("orderId");

-- FK: orderId → orders
ALTER TABLE "tickets"
  ADD CONSTRAINT "tickets_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── AlterTable: refund_requests — add ticketId ───────────────────────────────

ALTER TABLE "refund_requests"
  ADD COLUMN IF NOT EXISTS "ticketId" TEXT;
