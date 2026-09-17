'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveSeatConfiguration } from '../actions'
import type { SeatConfig } from '../queries'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketTypeOption {
  id: string
  name: string
  price: number
  currency: string
}

export interface SeatingManagerProps {
  eventId: string
  seatingType: 'RESERVED' | 'MIXED' | 'GENERAL_ADMISSION'
  ticketTypes: TicketTypeOption[]
  initialConfig: SeatConfig | null
}

interface RowDraft {
  id: string // local key only
  label: string
  seatCount: string
}

interface SectionDraft {
  id: string // local key only
  name: string
  code: string
  type: 'RESERVED' | 'GENERAL_ADMISSION'
  ticketTypeId: string
  priceOverride: string
  rows: RowDraft[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _uid = 0
function uid() {
  return String(++_uid)
}

/** Generate A, B, C ... Z, AA, AB ... given a 0-based index */
function rowLabel(index: number): string {
  let label = ''
  let n = index
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

function codeFromName(name: string): string {
  return (
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) || 'SEC'
  )
}

function totalSeats(sections: SectionDraft[]): number {
  return sections.reduce((sum, sec) => {
    return sum + sec.rows.reduce((rs, row) => rs + (parseInt(row.seatCount, 10) || 0), 0)
  }, 0)
}

function emptyRow(index: number): RowDraft {
  return { id: uid(), label: rowLabel(index), seatCount: '10' }
}

function emptySection(ticketTypes: TicketTypeOption[]): SectionDraft {
  return {
    id: uid(),
    name: '',
    code: '',
    type: 'RESERVED',
    ticketTypeId: ticketTypes[0]?.id ?? '',
    priceOverride: '',
    rows: [emptyRow(0)],
  }
}

/** Convert existing DB config to draft form for editing */
function configToDraft(config: SeatConfig, ticketTypes: TicketTypeOption[]): SectionDraft[] {
  return config.sections.map((sec) => ({
    id: uid(),
    name: sec.name,
    code: sec.code,
    type: sec.type as 'RESERVED' | 'GENERAL_ADMISSION',
    ticketTypeId: sec.ticketTypeId ?? ticketTypes[0]?.id ?? '',
    priceOverride: sec.price != null ? String(Math.round(sec.price / 100)) : '',
    rows: sec.rows.map((row) => ({
      id: uid(),
      label: row.label,
      seatCount: String(row.seatCount),
    })),
  }))
}

// ─── Section form sub-component ───────────────────────────────────────────────

interface SectionFormProps {
  index: number
  section: SectionDraft
  ticketTypes: TicketTypeOption[]
  onChange: (updated: SectionDraft) => void
  onRemove: () => void
  canRemove: boolean
}

function SectionForm({
  index,
  section,
  ticketTypes,
  onChange,
  onRemove,
  canRemove,
}: SectionFormProps) {
  function updateField<K extends keyof SectionDraft>(key: K, value: SectionDraft[K]) {
    onChange({ ...section, [key]: value })
  }

  function handleNameChange(name: string) {
    const code =
      section.code === '' || section.code === codeFromName(section.name)
        ? codeFromName(name)
        : section.code
    onChange({ ...section, name, code })
  }

  function addRow() {
    onChange({ ...section, rows: [...section.rows, emptyRow(section.rows.length)] })
  }

  function removeRow(rowId: string) {
    onChange({ ...section, rows: section.rows.filter((r) => r.id !== rowId) })
  }

  function updateRow(rowId: string, updated: RowDraft) {
    onChange({ ...section, rows: section.rows.map((r) => (r.id === rowId ? updated : r)) })
  }

  const defaultPricePlaceholder = (() => {
    const tt = ticketTypes.find((t) => t.id === section.ticketTypeId)
    return tt ? `Default: ₦${(tt.price / 100).toLocaleString()}` : 'e.g. 5000'
  })()

  return (
    <div className="border-border space-y-3 rounded-xl border border-dashed p-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold">Section {index + 1}</p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-lg p-1.5 transition-colors"
            aria-label="Remove section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Name + Code */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-medium">Section name *</label>
          <input
            value={section.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. VIP, General, Floor"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium">Code *</label>
          <input
            value={section.code}
            onChange={(e) =>
              updateField('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
            }
            placeholder="e.g. VIP"
            maxLength={8}
            required
            className={inputCls}
          />
        </div>
      </div>

      {/* Type + Ticket type */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-medium">Section type</label>
          <select
            value={section.type}
            onChange={(e) =>
              updateField('type', e.target.value as 'RESERVED' | 'GENERAL_ADMISSION')
            }
            className={inputCls}
          >
            <option value="RESERVED">Reserved (numbered seats)</option>
            <option value="GENERAL_ADMISSION">General Admission</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium">Ticket type *</label>
          <select
            value={section.ticketTypeId}
            onChange={(e) => updateField('ticketTypeId', e.target.value)}
            required
            className={inputCls}
          >
            {ticketTypes.length === 0 && <option value="">No ticket types yet</option>}
            {ticketTypes.map((tt) => (
              <option key={tt.id} value={tt.id}>
                {tt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Price override */}
      <div>
        <label className="mb-1 block text-[12px] font-medium">
          Price override{' '}
          <span className="text-muted-foreground font-normal">
            (₦ — leave blank to use ticket type price)
          </span>
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={section.priceOverride}
          onChange={(e) => updateField('priceOverride', e.target.value)}
          placeholder={defaultPricePlaceholder}
          className={inputCls}
        />
      </div>

      {/* Rows */}
      <div>
        <p className="mb-2 text-[12px] font-medium">Rows</p>
        <div className="space-y-2">
          {section.rows.map((row, ri) => (
            <div key={row.id} className="flex items-center gap-2">
              <input
                value={row.label}
                onChange={(e) =>
                  updateRow(row.id, { ...row, label: e.target.value.toUpperCase() })
                }
                placeholder="Row"
                maxLength={10}
                required
                aria-label={`Row ${ri + 1} label`}
                className={cn(inputCls, 'w-20 text-center')}
              />
              <input
                type="number"
                min={1}
                max={500}
                value={row.seatCount}
                onChange={(e) => updateRow(row.id, { ...row, seatCount: e.target.value })}
                placeholder="Seats"
                required
                aria-label={`Row ${ri + 1} seat count`}
                className={cn(inputCls, 'flex-1')}
              />
              <span className="text-muted-foreground shrink-0 text-[11px]">seats</span>
              {section.rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label={`Remove row ${row.label}`}
                  className="text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-lg p-1.5 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="text-brand-500 hover:text-brand-400 mt-2 flex items-center gap-1.5 text-[12px] font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add row
        </button>
      </div>

      <p className="text-muted-foreground text-[11.5px]">
        {section.rows.reduce((s, r) => s + (parseInt(r.seatCount, 10) || 0), 0)} seat(s) in this
        section
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SeatingManager({
  eventId,
  seatingType,
  ticketTypes,
  initialConfig,
}: SeatingManagerProps) {
  if (seatingType === 'GENERAL_ADMISSION') return null

  const [isOpen, setIsOpen] = useState(false)
  const [sections, setSections] = useState<SectionDraft[]>(() =>
    initialConfig ? configToDraft(initialConfig, ticketTypes) : [emptySection(ticketTypes)]
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // true after the very first save — triggers the "open visual editor" prompt
  const [justCreated, setJustCreated] = useState(false)

  const total = totalSeats(sections)

  function addSection() {
    setSections((prev) => [...prev, emptySection(ticketTypes)])
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id))
  }

  function updateSection(id: string, updated: SectionDraft) {
    setSections((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Client-side validation
    for (const sec of sections) {
      if (!sec.name.trim()) return setError('All sections must have a name.')
      if (!sec.code.trim()) return setError('All sections must have a code.')
      if (!sec.ticketTypeId) return setError('All sections must have a ticket type selected.')
      for (const row of sec.rows) {
        if (!row.label.trim()) return setError('All rows must have a label.')
        const cnt = parseInt(row.seatCount, 10)
        if (!cnt || cnt < 1) return setError('All rows must have at least 1 seat.')
      }
    }

    const payload = sections.map((sec) => ({
      name: sec.name.trim(),
      code: sec.code.trim(),
      type: sec.type,
      ticketTypeId: sec.ticketTypeId,
      priceOverride:
        sec.priceOverride !== '' ? Math.round(parseFloat(sec.priceOverride) * 100) : undefined,
      rows: sec.rows.map((row) => ({
        label: row.label.trim(),
        seatCount: parseInt(row.seatCount, 10),
      })),
    }))

    startTransition(async () => {
      const result = await saveSeatConfiguration({ eventId, sections: payload })
      if (result.success) {
        setSuccess(
          `Configuration saved — ${result.data.totalSeats.toLocaleString()} seat(s) generated.`
        )
        // First-time save: flag to show the visual editor prompt
        if (!initialConfig) setJustCreated(true)
        setIsOpen(false)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold">Seat Configuration</h2>
          {initialConfig && !isOpen && (
            <p className="text-muted-foreground mt-0.5 text-[12px]">
              {initialConfig.sections.length} section(s) ·{' '}
              {initialConfig.sections
                .reduce((s, sec) => s + sec.eventSeatCount, 0)
                .toLocaleString()}{' '}
              seat(s)
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setIsOpen((v) => !v)
            setError(null)
            setSuccess(null)
          }}
          className="text-brand-500 hover:text-brand-400 flex items-center gap-1.5 text-[12.5px] font-medium transition-colors"
        >
          {isOpen ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Cancel
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              {initialConfig ? 'Edit configuration' : 'Configure seats'}
            </>
          )}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && !isOpen && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-[12.5px] text-emerald-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
          {justCreated && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5">
              <div>
                <p className="text-[12px] font-semibold text-emerald-300">Seats are ready</p>
                <p className="text-emerald-500/80 mt-0.5 text-[11px]">
                  Open the visual editor to block seats, assign types, and arrange your layout.
                </p>
              </div>
              <Link
                href={`/dashboard/events/${eventId}/seat-map/edit`}
                className="ml-4 flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Open editor
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Summary when closed and config exists */}
      {!isOpen && initialConfig && (
        <div className="space-y-2">
          {initialConfig.sections.map((sec) => (
            <div
              key={sec.id}
              className="border-border flex items-center justify-between rounded-xl border px-4 py-3"
            >
              <div>
                <p className="text-[13.5px] font-semibold">
                  {sec.name}{' '}
                  <span className="text-muted-foreground text-[11px] font-normal">({sec.code})</span>
                </p>
                <p className="text-muted-foreground mt-0.5 text-[12px]">
                  {sec.rows.length} row(s) · {sec.eventSeatCount} seat(s)
                  {sec.price != null && ` · ₦${(sec.price / 100).toLocaleString()}`}
                </p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                  sec.type === 'RESERVED'
                    ? 'bg-brand-500/10 text-brand-500'
                    : 'bg-zinc-500/10 text-zinc-400'
                )}
              >
                {sec.type === 'RESERVED' ? 'Reserved' : 'GA'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isOpen && !initialConfig && (
        <p className="text-muted-foreground text-[13px]">
          No seat configuration yet. Click &ldquo;Configure seats&rdquo; to define sections and
          rows.
        </p>
      )}

      {/* Form */}
      {isOpen && (
        <form onSubmit={handleSave} className="space-y-4">
          {sections.map((sec, idx) => (
            <SectionForm
              key={sec.id}
              index={idx}
              section={sec}
              ticketTypes={ticketTypes}
              onChange={(updated) => updateSection(sec.id, updated)}
              onRemove={() => removeSection(sec.id)}
              canRemove={sections.length > 1}
            />
          ))}

          <button
            type="button"
            onClick={addSection}
            className="text-brand-500 hover:text-brand-400 flex items-center gap-1.5 text-[12.5px] font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add section
          </button>

          {ticketTypes.length === 0 && (
            <p className="text-amber-500 text-[12px]">
              Add at least one ticket type above before configuring seats.
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-muted-foreground text-[12.5px]">
              Total:{' '}
              <span className="text-foreground font-semibold">
                {total.toLocaleString()} seat(s)
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setError(null)
                  setSections(
                    initialConfig
                      ? configToDraft(initialConfig, ticketTypes)
                      : [emptySection(ticketTypes)]
                  )
                }}
                className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-[12.5px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || ticketTypes.length === 0}
                className="bg-brand-600 flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save configuration
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputCls = cn(
  'w-full rounded-lg border border-border bg-background px-3 py-2',
  'text-[13px] text-foreground placeholder:text-muted-foreground',
  'outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30'
)
