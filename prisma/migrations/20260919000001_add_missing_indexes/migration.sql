-- Add index on Ticket.ticketTypeId for analytics and webhook queries
CREATE INDEX IF NOT EXISTS "tickets_ticketTypeId_idx" ON "tickets"("ticketTypeId");

-- Add composite index on Reservation(status, expiresAt) for expiry cleanup queries
CREATE INDEX IF NOT EXISTS "reservations_status_expiresAt_idx" ON "reservations"("status", "expiresAt");
