-- Migration: organizer KYC application
-- Adds KycStatus enum and organizer_applications table.

DO $$ BEGIN
  CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "organizer_applications" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "organizerName" TEXT NOT NULL,
    "bio"           TEXT,
    "nin"           TEXT NOT NULL,
    "bvn"           TEXT NOT NULL,
    "idType"        TEXT NOT NULL,
    "idDocUrl"      TEXT NOT NULL,
    "instagramUrl"  TEXT,
    "twitterUrl"    TEXT,
    "facebookUrl"   TEXT,
    "websiteUrl"    TEXT,
    "kycStatus"     "KycStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote"    TEXT,
    "reviewedAt"    TIMESTAMP(3),
    "reviewedBy"    TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizer_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "organizer_applications_userId_key"
    ON "organizer_applications"("userId");

CREATE INDEX IF NOT EXISTS "organizer_applications_kycStatus_idx"
    ON "organizer_applications"("kycStatus");

ALTER TABLE "organizer_applications"
    DROP CONSTRAINT IF EXISTS "organizer_applications_userId_fkey";

ALTER TABLE "organizer_applications"
    ADD CONSTRAINT "organizer_applications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
