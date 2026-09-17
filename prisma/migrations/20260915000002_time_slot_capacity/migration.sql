-- Migration: time_slot_capacity
-- Replaces the flat capacity/price on time_slots with a per-ticket-type
-- capacity junction table (time_slot_capacities).
-- Also adds ticketTypeId to time_slot_tickets for per-type inventory tracking.

-- ─── AlterTable: time_slots — drop flat capacity/price columns ────────────────

ALTER TABLE "time_slots"
  DROP COLUMN IF EXISTS "capacity",
  DROP COLUMN IF EXISTS "price",
  DROP COLUMN IF EXISTS "currency";

-- ─── CreateTable: time_slot_capacities ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS "time_slot_capacities" (
    "id"           TEXT        NOT NULL,
    "timeSlotId"   TEXT        NOT NULL,
    "ticketTypeId" TEXT        NOT NULL,
    "capacity"     INTEGER     NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_slot_capacities_pkey" PRIMARY KEY ("id")
);

-- Unique: one entry per slot+ticketType
CREATE UNIQUE INDEX IF NOT EXISTS "time_slot_capacities_timeSlotId_ticketTypeId_key"
  ON "time_slot_capacities"("timeSlotId", "ticketTypeId");

CREATE INDEX IF NOT EXISTS "time_slot_capacities_timeSlotId_idx"
  ON "time_slot_capacities"("timeSlotId");

-- Foreign keys
ALTER TABLE "time_slot_capacities"
  ADD CONSTRAINT "time_slot_capacities_timeSlotId_fkey"
  FOREIGN KEY ("timeSlotId") REFERENCES "time_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_slot_capacities"
  ADD CONSTRAINT "time_slot_capacities_ticketTypeId_fkey"
  FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── AlterTable: time_slot_tickets — add ticketTypeId ────────────────────────

ALTER TABLE "time_slot_tickets"
  ADD COLUMN IF NOT EXISTS "ticketTypeId" TEXT;

-- Index for per-type capacity lookups
CREATE INDEX IF NOT EXISTS "time_slot_tickets_timeSlotId_ticketTypeId_idx"
  ON "time_slot_tickets"("timeSlotId", "ticketTypeId");

-- FK (nullable for backward compat with any existing rows)
ALTER TABLE "time_slot_tickets"
  ADD CONSTRAINT "time_slot_tickets_ticketTypeId_fkey"
  FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
