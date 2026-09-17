-- Migration: remove bvn from organizer_applications
-- BVN is no longer collected during the KYC flow.

ALTER TABLE "organizer_applications" DROP COLUMN IF EXISTS "bvn";
