-- Add direct venue fields to Event model
-- Users manually enter venue details instead of selecting from Venue table
ALTER TABLE "events" ADD COLUMN "venueName" TEXT;
ALTER TABLE "events" ADD COLUMN "venueAddress" TEXT;
ALTER TABLE "events" ADD COLUMN "venueCity" TEXT;
ALTER TABLE "events" ADD COLUMN "venueState" TEXT;
ALTER TABLE "events" ADD COLUMN "venueCountry" TEXT DEFAULT 'Nigeria';
