'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Loader2, AlertCircle, X } from 'lucide-react'
import { upsertTicketType, deleteTicketType } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableTicketType {
  id: string
  name: string
  price: number
  currency: string
  quantity: number | null
  sold: number
  tableCapacity: number | null
  requiresAssignedSeating: boolean
}

interface TableConfigTabProps {
  eventId: string
  tableTicketTypes: TableTicketType[]
}

const inputCls =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40 disabled:opacity-50'

const labelCls = 'block text-[11.5px] font-medium text-zinc-400 mb-1'

// ─── Inline form ──────────────────────────────────────────────────────────────

interface TableFormState {
  name: string
  price: string
  quantity: string
  tableCapacity: string
  requiresAssignedSeating: boolean
}

function defaultForm(tt?: TableTicketType): TableFormState {
  return {
    name: tt?.name ?? '',
    price: tt ? String(tt.price) : '0',
    quantity: tt?.quantity != null ? String(tt.quantity) : '',
    tableCapacity: tt?.tableCapacity != null ? String(tt.tableCapacity) : '',
    requiresAssignedSeating: tt?.requiresAssignedSeating ?? false,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TableConfigTab({ eventId, tableTicketTypes }: TableConfigTabProps) {
  const [tables, setTables] = useState(tableTicketTypes)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [formState, setFormState] = useState<TableFormState>(defaultForm())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openNew() {
    setEditingId('new')
    setFormState(defaultForm())
    setError(null)
  }

  function openEdit(tt: TableTicketType) {
    setEditingId(tt.id)
    setFormState(defaultForm(tt))
    setError(null)
  }

  function closeForm() {
    setEditingId(null)
    setError(null)
  }

  function setField<K extends keyof TableFormState>(key: K, value: TableFormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await upsertTicketType({
        eventId,
        ...(editingId !== 'new' ? { ticketTypeId: editingId! } : {}),
        name: formState.name,
        price: Number(formState.price),
        quantity: formState.quantity !== '' ? Number(formState.quantity) : null,
        visibility: 'PUBLIC',
        isTableType: true,
        tableCapacity: formState.tableCapacity !== '' ? Number(formState.tableCapacity) : null,
        requiresAssignedSeating: formState.requiresAssignedSeating,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      // Optimistic update — refresh by reloading data from server on next render
      if (editingId === 'new') {
        setTables((prev) => [
          ...prev,
          {
            id: result.ticketTypeId,
            name: formState.name,
            price: Number(formState.price),
            currency: 'NGN',
            quantity: formState.quantity !== '' ? Number(formState.quantity) : null,
            sold: 0,
            tableCapacity: formState.tableCapacity !== '' ? Number(formState.tableCapacity) : null,
            requiresAssignedSeating: formState.requiresAssignedSeating,
          },
        ])
      } else {
        setTables((prev) =>
          prev.map((t) =>
            t.id === editingId
              ? { ...t, name: formState.name, price: Number(formState.price), quantity: formState.quantity !== '' ? Number(formState.quantity) : null, tableCapacity: formState.tableCapacity !== '' ? Number(formState.tableCapacity) : null, requiresAssignedSeating: formState.requiresAssignedSeating }
              : t
          )
        )
      }

      closeForm()
    })
  }

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteTicketType(id)
      if (!result.success) {
        setError(result.error)
      } else {
        setTables((prev) => prev.filter((t) => t.id !== id))
      }
      setDeleteConfirmId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-zinc-300">Table Types</h3>
        <button
          type="button"
          onClick={openNew}
          disabled={isPending || editingId !== null}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600/10 border border-violet-500/30 px-3 py-1.5 text-[12.5px] font-medium text-violet-400 hover:bg-violet-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Table
        </button>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {/* Inline form */}
      {editingId !== null && (
        <form onSubmit={handleSave} className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-semibold text-zinc-200">
              {editingId === 'new' ? 'New Table' : 'Edit Table'}
            </p>
            <button type="button" onClick={closeForm} disabled={isPending} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Name *</label>
              <input className={inputCls} value={formState.name} onChange={(e) => setField('name', e.target.value)} required placeholder="e.g. VIP Table" disabled={isPending} />
            </div>
            <div>
              <label className={labelCls}>Price (kobo)</label>
              <input type="number" min={0} className={inputCls} value={formState.price} onChange={(e) => setField('price', e.target.value)} disabled={isPending} />
            </div>
            <div>
              <label className={labelCls}>Quantity</label>
              <input type="number" min={1} className={inputCls} value={formState.quantity} onChange={(e) => setField('quantity', e.target.value)} placeholder="Unlimited" disabled={isPending} />
            </div>
            <div>
              <label className={labelCls}>Seats per table</label>
              <input type="number" min={1} className={inputCls} value={formState.tableCapacity} onChange={(e) => setField('tableCapacity', e.target.value)} placeholder="e.g. 8" disabled={isPending} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formState.requiresAssignedSeating} onChange={(e) => setField('requiresAssignedSeating', e.target.checked)} disabled={isPending} className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-violet-500" />
            <span className="text-[13px] text-zinc-200">Require assigned seating</span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={closeForm} disabled={isPending} className="text-[13px] text-zinc-400 hover:text-zinc-200 px-3 py-1.5">Cancel</button>
            <button type="submit" disabled={isPending} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      )}

      {/* Table list */}
      {tables.length === 0 && editingId === null ? (
        <p className="text-[13px] text-zinc-500 text-center py-6">No table types yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {tables.map((tt) => (
            <div key={tt.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
              <div>
                <p className="text-[13px] font-medium text-zinc-100">{tt.name}</p>
                <p className="text-[11.5px] text-zinc-500">
                  {tt.tableCapacity ? `${tt.tableCapacity} seats · ` : ''}
                  {tt.sold} sold
                  {tt.quantity ? ` / ${tt.quantity}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => openEdit(tt)} disabled={isPending || editingId !== null} aria-label={`Edit ${tt.name}`} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors disabled:opacity-30">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {deleteConfirmId === tt.id ? (
                  <div className="flex items-center gap-1 ml-1">
                    <span className="text-[11px] text-zinc-400">Delete?</span>
                    <button type="button" onClick={() => handleDelete(tt.id)} disabled={isPending} className="rounded px-2 py-0.5 text-[11px] bg-red-600 text-white hover:bg-red-500 disabled:opacity-50">Yes</button>
                    <button type="button" onClick={() => setDeleteConfirmId(null)} disabled={isPending} className="rounded px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200">No</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(tt.id)}
                    disabled={isPending || tt.sold > 0}
                    title={tt.sold > 0 ? 'Cannot delete — tickets already sold' : 'Delete'}
                    aria-label={`Delete ${tt.name}`}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
