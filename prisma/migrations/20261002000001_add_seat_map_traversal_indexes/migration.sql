-- Indexes to speed up the seat map traversal in getEventBySlug / getEventPreview.
--
-- The deep include chain (seatMap → sections → rows → seats → eventSeats) fires
-- one subquery per JOIN level. Without indexes on the FK columns, each level
-- does a sequential scan on the child table.
--
-- rows.sectionId: Section → rows join (was missing — caused seq scan on rows)
CREATE INDEX IF NOT EXISTS "rows_sectionId_idx" ON "rows"("sectionId");

-- seats.rowId: Row → seats join (unique index is on (rowId, label) which helps,
-- but a plain rowId index lets Postgres use an index-only scan for the FK lookup)
CREATE INDEX IF NOT EXISTS "seats_rowId_idx" ON "seats"("rowId");

-- event_seats.seatId: Seat → eventSeats reverse lookup.
-- The unique index is on (eventId, seatId) — not useful when querying from seatId.
-- This index lets Prisma's nested include filter `where: { eventId }` execute as
-- an index scan rather than a sequential scan on the full event_seats table.
CREATE INDEX IF NOT EXISTS "event_seats_seatId_idx" ON "event_seats"("seatId");
