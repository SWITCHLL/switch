-- Migration: event_images table
-- Stores multiple images per event. Position 0 = primary banner.

CREATE TABLE IF NOT EXISTS "event_images" (
    "id"        TEXT NOT NULL,
    "eventId"   TEXT NOT NULL,
    "url"       TEXT NOT NULL,
    "position"  INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "event_images_eventId_position_idx"
    ON "event_images"("eventId", "position");

ALTER TABLE "event_images"
    DROP CONSTRAINT IF EXISTS "event_images_eventId_fkey";

ALTER TABLE "event_images"
    ADD CONSTRAINT "event_images_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
