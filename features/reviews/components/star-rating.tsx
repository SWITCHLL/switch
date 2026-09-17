'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  name: string
  defaultValue?: number
  readOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
}

export function StarRating({ name, defaultValue = 0, readOnly = false, size = 'md' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(defaultValue)
  const active = hovered || selected

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={cn(
            'transition-transform focus-visible:outline-none',
            !readOnly && 'cursor-pointer hover:scale-110'
          )}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          onClick={() => !readOnly && setSelected(star)}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              SIZE_MAP[size],
              'transition-colors',
              star <= active
                ? 'fill-amber-400 stroke-amber-400'
                : 'fill-transparent stroke-zinc-600'
            )}
          />
        </button>
      ))}
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selected} />
    </div>
  )
}
