-- Migration: Add inline venue fields to events table
-- Run this in your Supabase SQL editor before deploying the app.
-- These columns replace the venue FK lookup for new events.

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "venueName"    TEXT,
  ADD COLUMN IF NOT EXISTS "venueAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "venueCity"    TEXT,
  ADD COLUMN IF NOT EXISTS "venueState"   TEXT;
