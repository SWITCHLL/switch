import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility to merge Tailwind CSS class names.
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 *
 * @example
 *   cn('px-4 py-2', isActive && 'bg-indigo-500', 'text-white')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
