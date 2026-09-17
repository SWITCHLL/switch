-- CreateTable: UserCalendar
CREATE TABLE "user_calendars" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#7c3aed',
    "shareToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CalendarEvent
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "linkedEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CalendarShare
CREATE TABLE "calendar_shares" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "sharedWithId" TEXT NOT NULL,
    "canCopy" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_calendars_shareToken_key" ON "user_calendars"("shareToken");

-- CreateIndex
CREATE INDEX "user_calendars_userId_idx" ON "user_calendars"("userId");

-- CreateIndex
CREATE INDEX "calendar_events_calendarId_startsAt_idx" ON "calendar_events"("calendarId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_shares_calendarId_sharedWithId_key" ON "calendar_shares"("calendarId", "sharedWithId");

-- CreateIndex
CREATE INDEX "calendar_shares_sharedWithId_idx" ON "calendar_shares"("sharedWithId");

-- AddForeignKey
ALTER TABLE "user_calendars" ADD CONSTRAINT "user_calendars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "user_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_linkedEventId_fkey" FOREIGN KEY ("linkedEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_shares" ADD CONSTRAINT "calendar_shares_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "user_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_shares" ADD CONSTRAINT "calendar_shares_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
