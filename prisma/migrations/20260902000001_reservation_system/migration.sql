-- Migration: reservation_system
-- Adds new enums, extends existing models, and creates new models for the event reservation system

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "WaitlistStatus" AS ENUM ('PENDING', 'OFFERED', 'FULFILLED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SessionInclusionMode" AS ENUM ('INCLUDED', 'OPTIONAL_FREE', 'OPTIONAL_PAID', 'CAPACITY_LIMITED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TicketVisibility" AS ENUM ('PUBLIC', 'HIDDEN', 'PASSWORD_PROTECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AuditEntityType" AS ENUM ('RESERVATION', 'TICKET', 'WAITLIST_ENTRY', 'EVENT_SEAT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'STATUS_CHANGED', 'CANCELLED', 'REFUNDED', 'ISSUED', 'EXPIRED', 'OFFERED', 'FULFILLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: ticket_types — add new fields
ALTER TABLE "ticket_types"
  ADD COLUMN IF NOT EXISTS "minPerOrder" INTEGER,
  ADD COLUMN IF NOT EXISTS "maxPerOrder" INTEGER,
  ADD COLUMN IF NOT EXISTS "maxPerUser" INTEGER,
  ADD COLUMN IF NOT EXISTS "visibility" "TicketVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS "accessPasswordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "directLinkToken" TEXT,
  ADD COLUMN IF NOT EXISTS "isTableType" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tableCapacity" INTEGER,
  ADD COLUMN IF NOT EXISTS "requiresAssignedSeating" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: directLinkToken unique
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_types_directLinkToken_key" ON "ticket_types"("directLinkToken");

-- AlterTable: tickets — add isComplimentary
ALTER TABLE "tickets"
  ADD COLUMN IF NOT EXISTS "isComplimentary" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: reservations — add gaHolds and waitlistEntryId
ALTER TABLE "reservations"
  ADD COLUMN IF NOT EXISTS "gaHolds" JSONB,
  ADD COLUMN IF NOT EXISTS "waitlistEntryId" TEXT;

-- CreateIndex: reservations.waitlistEntryId unique
CREATE UNIQUE INDEX IF NOT EXISTS "reservations_waitlistEntryId_key" ON "reservations"("waitlistEntryId");

-- CreateTable: waitlist_entries
CREATE TABLE IF NOT EXISTS "waitlist_entries" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "requestedQty" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'PENDING',
    "offerExpiresAt" TIMESTAMP(3),
    "reservationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_entries_reservationId_key" ON "waitlist_entries"("reservationId");
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_entries_userId_ticketTypeId_key" ON "waitlist_entries"("userId", "ticketTypeId");
CREATE INDEX IF NOT EXISTS "waitlist_entries_ticketTypeId_status_position_idx" ON "waitlist_entries"("ticketTypeId", "status", "position");
CREATE INDEX IF NOT EXISTS "waitlist_entries_eventId_idx" ON "waitlist_entries"("eventId");

-- CreateTable: time_slots
CREATE TABLE IF NOT EXISTS "time_slots" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "TicketTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "time_slots_eventId_status_idx" ON "time_slots"("eventId", "status");

-- CreateTable: time_slot_tickets
CREATE TABLE IF NOT EXISTS "time_slot_tickets" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_slot_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "time_slot_tickets_ticketId_timeSlotId_key" ON "time_slot_tickets"("ticketId", "timeSlotId");

-- CreateTable: event_sessions
CREATE TABLE IF NOT EXISTS "event_sessions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "facilitator" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "price" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "inclusionMode" "SessionInclusionMode" NOT NULL DEFAULT 'INCLUDED',
    "status" "TicketTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "event_sessions_eventId_idx" ON "event_sessions"("eventId");

-- CreateTable: session_enrolments
CREATE TABLE IF NOT EXISTS "session_enrolments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_enrolments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "session_enrolments_ticketId_sessionId_key" ON "session_enrolments"("ticketId", "sessionId");
CREATE INDEX IF NOT EXISTS "session_enrolments_sessionId_idx" ON "session_enrolments"("sessionId");

-- CreateTable: table_seat_assignments
CREATE TABLE IF NOT EXISTS "table_seat_assignments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "attendeeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_seat_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "table_seat_assignments_ticketId_seatNumber_key" ON "table_seat_assignments"("ticketId", "seatNumber");

-- CreateTable: audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "actor" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs"("actor");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey: reservations.waitlistEntryId → waitlist_entries
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_waitlistEntryId_fkey"
  FOREIGN KEY ("waitlistEntryId") REFERENCES "waitlist_entries"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: waitlist_entries
ALTER TABLE "waitlist_entries"
  ADD CONSTRAINT "waitlist_entries_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "waitlist_entries"
  ADD CONSTRAINT "waitlist_entries_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "waitlist_entries"
  ADD CONSTRAINT "waitlist_entries_ticketTypeId_fkey"
  FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: time_slots
ALTER TABLE "time_slots"
  ADD CONSTRAINT "time_slots_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: time_slot_tickets
ALTER TABLE "time_slot_tickets"
  ADD CONSTRAINT "time_slot_tickets_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "time_slot_tickets"
  ADD CONSTRAINT "time_slot_tickets_timeSlotId_fkey"
  FOREIGN KEY ("timeSlotId") REFERENCES "time_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: event_sessions
ALTER TABLE "event_sessions"
  ADD CONSTRAINT "event_sessions_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: session_enrolments
ALTER TABLE "session_enrolments"
  ADD CONSTRAINT "session_enrolments_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "session_enrolments"
  ADD CONSTRAINT "session_enrolments_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "event_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: table_seat_assignments
ALTER TABLE "table_seat_assignments"
  ADD CONSTRAINT "table_seat_assignments_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "table_seat_assignments"
  ADD CONSTRAINT "table_seat_assignments_ticketTypeId_fkey"
  FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
