import type {
  EventInventory,
  TicketTypeInventory,
  TimeSlotInventory,
  SessionInventory,
  SeatSectionInventory,
} from '@/features/organizer/queries'
import { ExportInventoryButton } from './export-inventory-button'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '∞'
  return n.toLocaleString()
}

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ─── Capacity bar ─────────────────────────────────────────────────────────────

function CapacityBar({ used, total }: { used: number; total: number | null }) {
  if (total === null) return null
  const pct = total === 0 ? 0 : Math.min(100, Math.round((used / total) * 100))
  const color =
    pct >= 95 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% sold`}
      />
    </div>
  )
}

// ─── Ticket Type Card ─────────────────────────────────────────────────────────

function TicketTypeCard({ tt }: { tt: TicketTypeInventory }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-zinc-100">{tt.name}</h3>
        {tt.waitlistCount > 0 && (
          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-amber-400">
            {tt.waitlistCount} waiting
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        <StatCell label="Total" value={fmtNum(tt.total)} />
        <StatCell label="Sold" value={fmtNum(tt.sold)} accent="text-violet-400" />
        <StatCell label="Held" value={fmtNum(tt.held)} accent="text-amber-400" />
        <StatCell
          label="Available"
          value={fmtNum(tt.available)}
          accent={tt.available === 0 ? 'text-red-400' : 'text-emerald-400'}
        />
        <StatCell label="Cancelled" value={fmtNum(tt.cancelled)} />
      </div>

      <CapacityBar used={tt.sold + tt.held} total={tt.total} />
    </div>
  )
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className={`text-base font-semibold ${accent ?? 'text-zinc-200'}`}>{value}</span>
    </div>
  )
}

// ─── Time Slot Row ────────────────────────────────────────────────────────────

function TimeSlotRow({ slot }: { slot: TimeSlotInventory }) {
  const pct =
    slot.totalCapacity === 0 ? 0 : Math.min(100, Math.round((slot.totalBooked / slot.totalCapacity) * 100))
  const isFull = slot.totalAvailable === 0

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">{slot.label}</p>
          <p className="text-[11.5px] text-zinc-500">
            {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-sm font-semibold ${isFull ? 'text-red-400' : 'text-emerald-400'}`}>
            {isFull ? 'Full' : `${slot.totalAvailable} left`}
          </p>
          <p className="text-[11.5px] text-zinc-500">
            {slot.totalBooked}/{slot.totalCapacity}
          </p>
        </div>
      </div>
      <CapacityBar used={slot.totalBooked} total={slot.totalCapacity} />
      {slot.capacities.length > 1 && (
        <div className="mt-2 space-y-1">
          {slot.capacities.map((cap) => (
            <div key={cap.ticketTypeId} className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">{cap.ticketTypeName}</span>
              <span className={cap.available === 0 ? 'text-red-400' : 'text-zinc-400'}>
                {cap.booked}/{cap.capacity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Session Row ──────────────────────────────────────────────────────────────

const INCLUSION_LABELS: Record<string, string> = {
  INCLUDED: 'Included',
  OPTIONAL_FREE: 'Optional (Free)',
  OPTIONAL_PAID: 'Optional (Paid)',
  CAPACITY_LIMITED: 'Capacity-limited',
}

function SessionRow({ session }: { session: SessionInventory }) {
  const isFull = session.remaining === 0
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{session.title}</p>
        <p className="text-[11.5px] text-zinc-500">
          {INCLUSION_LABELS[session.inclusionMode] ?? session.inclusionMode}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {session.capacity === null ? (
          <p className="text-sm font-semibold text-zinc-400">
            {session.enrolmentCount} enrolled
          </p>
        ) : (
          <>
            <p
              className={`text-sm font-semibold ${isFull ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {isFull ? 'Full' : `${session.remaining} left`}
            </p>
            <p className="text-[11.5px] text-zinc-500">
              {session.enrolmentCount}/{session.capacity}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Seat Section Row ─────────────────────────────────────────────────────────

function SeatSectionRow({ section }: { section: SeatSectionInventory }) {
  const total = Object.values(section.counts).reduce((a, b) => a + b, 0)
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-100">{section.sectionName}</p>
        <p className="text-[11.5px] text-zinc-500">{total} seats</p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {(
          [
            ['AVAILABLE', 'text-emerald-400'],
            ['HELD', 'text-amber-400'],
            ['SOLD', 'text-violet-400'],
            ['RESERVED', 'text-blue-400'],
            ['BLOCKED', 'text-red-400'],
          ] as [keyof typeof section.counts, string][]
        ).map(([status, color]) => (
          <div key={status} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {status}
            </span>
            <span className={`text-sm font-semibold ${color}`}>
              {section.counts[status] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface InventoryDashboardProps {
  inventory: EventInventory
  eventTitle: string
}

export function InventoryDashboard({ inventory, eventTitle }: InventoryDashboardProps) {
  return (
    <div className="space-y-8">
      {/* ── Ticket Types ── */}
      <section aria-labelledby="ticket-types-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2
            id="ticket-types-heading"
            className="text-sm font-medium uppercase tracking-wide text-zinc-400"
          >
            Ticket Types
          </h2>
          <ExportInventoryButton eventId={inventory.eventId} eventTitle={eventTitle} />
        </div>

        {inventory.ticketTypes.length === 0 ? (
          <p className="text-sm text-zinc-500">No ticket types configured.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {inventory.ticketTypes.map((tt) => (
              <TicketTypeCard key={tt.ticketTypeId} tt={tt} />
            ))}
          </div>
        )}
      </section>

      {/* ── Time Slots ── */}
      {inventory.timeSlots.length > 0 && (
        <section aria-labelledby="time-slots-heading">
          <h2
            id="time-slots-heading"
            className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-400"
          >
            Time Slots
          </h2>
          <div className="space-y-2">
            {inventory.timeSlots.map((slot) => (
              <TimeSlotRow key={slot.timeSlotId} slot={slot} />
            ))}
          </div>
        </section>
      )}

      {/* ── Sessions ── */}
      {inventory.sessions.length > 0 && (
        <section aria-labelledby="sessions-heading">
          <h2
            id="sessions-heading"
            className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-400"
          >
            Sessions
          </h2>
          <div className="space-y-2">
            {inventory.sessions.map((sess) => (
              <SessionRow key={sess.sessionId} session={sess} />
            ))}
          </div>
        </section>
      )}

      {/* ── Seat Sections (RESERVED / MIXED events only) ── */}
      {inventory.seatSections.length > 0 && (
        <section aria-labelledby="seat-sections-heading">
          <h2
            id="seat-sections-heading"
            className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-400"
          >
            Seating Sections
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {inventory.seatSections.map((sec) => (
              <SeatSectionRow key={sec.sectionId} section={sec} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
