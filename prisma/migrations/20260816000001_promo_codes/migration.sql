-- Migration: promo_codes
-- Adds DiscountType enum, PromoCode table, and new columns on payments.
-- All statements are additive and idempotent.

-- ─── New Enum ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FLAT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── PromoCode table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "promo_codes" (
    "id"            TEXT NOT NULL,
    "organizerId"   TEXT NOT NULL,
    "eventId"       TEXT,
    "ticketTypeId"  TEXT,
    "code"          TEXT NOT NULL,
    "discountType"  "DiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "maxUses"       INTEGER,
    "usedCount"     INTEGER NOT NULL DEFAULT 0,
    "expiresAt"     TIMESTAMP(3),
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_key"         ON "promo_codes"("code");
CREATE INDEX        IF NOT EXISTS "promo_codes_organizerId_idx"  ON "promo_codes"("organizerId");
CREATE INDEX        IF NOT EXISTS "promo_codes_eventId_idx"      ON "promo_codes"("eventId");

-- ─── New columns on payments ──────────────────────────────────────────────────

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "promoCodeId"    TEXT,
  ADD COLUMN IF NOT EXISTS "discountAmount" INTEGER;

-- ─── Foreign Keys ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_organizerId_fkey"
    FOREIGN KEY ("organizerId") REFERENCES "organizers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_ticketTypeId_fkey"
    FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_promoCodeId_fkey"
    FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
