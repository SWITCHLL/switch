'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { exportInventoryCSV } from '../actions'

interface ExportInventoryButtonProps {
  eventId: string
  eventTitle: string
}

export function ExportInventoryButton({ eventId, eventTitle }: ExportInventoryButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setError(null)
    setIsLoading(true)
    try {
      const result = await exportInventoryCSV(eventId)
      if (result.success) {
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-inventory.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        setError(result.error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={isLoading}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-[12.5px] font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Export CSV
      </button>
      {error && (
        <p role="alert" className="mt-1 text-[11.5px] text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
