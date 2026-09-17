-- Migration: event_schedule
-- Adds EventScheduleItem model for organizer-managed event programmes

-- CreateTable
CREATE TABLE IF NOT EXISTS "event_schedule_items" (
    "id"          TEXT NOT NULL,
    "eventId"     TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "hostName"    TEXT,
    "speakerId"   TEXT,
    "startsAt"    TIMESTAMP(3),
    "endsAt"      TIMESTAMP(3),
    "position"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_schedule_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "event_schedule_items"
    ADD CONSTRAINT "event_schedule_items_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_schedule_items"
    ADD CONSTRAINT "event_schedule_items_speakerId_fkey"
    FOREIGN KEY ("speakerId") REFERENCES "event_speakers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "event_schedule_items_eventId_position_idx"
    ON "event_schedule_items"("eventId", "position");
