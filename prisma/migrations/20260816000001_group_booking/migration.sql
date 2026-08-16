-- Migration: group booking
-- Adds GroupOrder and GroupOrderSlot tables for the split-payment group booking feature.
-- All statements are additive and safe to run on an existing database.

-- ─── New Enums ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "GroupOrderStatus" AS ENUM ('PENDING', 'COMPLETE', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "GroupSlotStatus" AS ENUM ('OPEN', 'HELD', 'PAID', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── GroupOrder ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "group_orders" (
    "id"                 TEXT        NOT NULL,
    "eventId"            TEXT        NOT NULL,
    "initiatorId"        TEXT        NOT NULL,
    "code"               TEXT        NOT NULL,
    "status"             "GroupOrderStatus" NOT NULL DEFAULT 'PENDING',
    "requireFullPayment" BOOLEAN     NOT NULL DEFAULT false,
    "expiresAt"          TIMESTAMP(3) NOT NULL,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_orders_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "group_orders"
    ADD CONSTRAINT "group_orders_eventId_fkey"
        FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "group_orders_initiatorId_fkey"
        FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "group_orders_code_key"      ON "group_orders"("code");
CREATE        INDEX IF NOT EXISTS "group_orders_eventId_status" ON "group_orders"("eventId", "status");
CREATE        INDEX IF NOT EXISTS "group_orders_initiatorId"    ON "group_orders"("initiatorId");

-- ─── GroupOrderSlot ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "group_order_slots" (
    "id"           TEXT        NOT NULL,
    "groupOrderId" TEXT        NOT NULL,
    "eventSeatId"  TEXT,
    "ticketTypeId" TEXT,
    "price"        INTEGER     NOT NULL,
    "currency"     TEXT        NOT NULL DEFAULT 'NGN',
    "label"        TEXT,
    "status"       "GroupSlotStatus" NOT NULL DEFAULT 'OPEN',
    "claimedBy"    TEXT,
    "claimedAt"    TIMESTAMP(3),
    "paymentId"    TEXT,
    "ticketId"     TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_order_slots_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "group_order_slots"
    ADD CONSTRAINT "group_order_slots_groupOrderId_fkey"
        FOREIGN KEY ("groupOrderId") REFERENCES "group_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "group_order_slots_eventSeatId_fkey"
        FOREIGN KEY ("eventSeatId") REFERENCES "event_seats"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "group_order_slots_ticketTypeId_fkey"
        FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "group_order_slots_claimedBy_fkey"
        FOREIGN KEY ("claimedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "group_order_slots_paymentId_fkey"
        FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "group_order_slots_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "group_order_slots_paymentId_key" ON "group_order_slots"("paymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "group_order_slots_ticketId_key"  ON "group_order_slots"("ticketId");
CREATE        INDEX IF NOT EXISTS "group_order_slots_groupOrderId_status"
    ON "group_order_slots"("groupOrderId", "status");
