'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyLinkProps {
  url: string
  label?: string
}

export function CopyLink({ url, label = 'Copy invite link' }: CopyLinkProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers that block clipboard without HTTPS
      window.prompt('Copy this link:', url)
    }
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: 'Join my group booking', url }).catch(() => null)
    } else {
      await handleCopy()
    }
  }

  return (
    <div className="border-border bg-surface flex items-center gap-2 overflow-hidden rounded-xl border p-1 pl-3.5">
      <p className="min-w-0 flex-1 truncate text-[12px] text-zinc-400 select-all">{url}</p>

      <div className="flex shrink-0 gap-1">
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleShare}
            aria-label="Share invite link"
            className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          >
            <Share2 className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        )}

        <button
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : label}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all',
            copied
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-brand-600 hover:bg-brand-500 text-white'
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}
