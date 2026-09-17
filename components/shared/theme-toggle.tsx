'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  function toggle() {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'group relative flex h-7 w-[52px] cursor-pointer items-center rounded-full p-0.5',
        'border transition-all duration-300 ease-out focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDark
          ? 'border-white/10 bg-white/5'
          : 'border-black/10 bg-black/5'
      )}
    >
      {/* Track icons */}
      <span className="pointer-events-none absolute left-1.5 flex h-4 w-4 items-center justify-center">
        {/* Sun — left side */}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={cn(
            'h-3 w-3 transition-all duration-300',
            isDark ? 'opacity-30 text-white' : 'opacity-0 text-amber-500'
          )}
        >
          <circle cx="8" cy="8" r="3" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="8" y1="1.5" x2="8" y2="3"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
              transform={`rotate(${deg} 8 8)`}
            />
          ))}
        </svg>
      </span>
      <span className="pointer-events-none absolute right-1.5 flex h-4 w-4 items-center justify-center">
        {/* Moon — right side */}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={cn(
            'h-3 w-3 transition-all duration-300',
            isDark ? 'opacity-0 text-slate-300' : 'opacity-30 text-slate-500'
          )}
        >
          <path
            d="M13 8.5A5.5 5.5 0 0 1 7.5 3 5.5 5.5 0 1 0 13 8.5Z"
            fill="currentColor"
          />
        </svg>
      </span>

      {/* Sliding thumb */}
      <span
        className={cn(
          'relative z-10 flex h-6 w-6 items-center justify-center rounded-full',
          'shadow-sm transition-all duration-300 ease-out',
          isDark
            ? 'translate-x-[25px] bg-[#1e1e2e]'
            : 'translate-x-0 bg-white'
        )}
      >
        {mounted && (
          isDark ? (
            /* Moon icon in thumb */
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-indigo-300">
              <path
                d="M13 8.5A5.5 5.5 0 0 1 7.5 3 5.5 5.5 0 1 0 13 8.5Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            /* Sun icon in thumb */
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-amber-500">
              <circle cx="8" cy="8" r="3" fill="currentColor" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <line
                  key={deg}
                  x1="8" y1="1.5" x2="8" y2="3"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  transform={`rotate(${deg} 8 8)`}
                />
              ))}
            </svg>
          )
        )}
      </span>
    </button>
  )
}
