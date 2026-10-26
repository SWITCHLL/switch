-- Add sessionVersion to users for JWT revocation support.
-- Existing users start at 0 (matches the @default(0) on the schema field).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
