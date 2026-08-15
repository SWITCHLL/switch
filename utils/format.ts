/**
 * Formatting utilities used across the platform.
 */
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

// ─── Date / Time ──────────────────────────────────────────────────────────────

/**
 * Formats a date string or Date object to a human-readable form.
 * @example formatDate('2026-08-12') → 'Aug 12, 2026'
 */
export function formatDate(
  date: Date | string | null | undefined,
  pattern = 'MMM d, yyyy'
): string {
  if (!date) return ''
  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return ''
  return format(parsed, pattern)
}

/**
 * Returns a relative time string.
 * @example formatRelative(new Date()) → 'less than a minute ago'
 */
export function formatRelative(date: Date | string): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return ''
  return formatDistanceToNow(parsed, { addSuffix: true })
}

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Formats an amount as a currency string.
 * @example formatCurrency(15000) → '₦15,000.00'
 */
export function formatCurrency(amount: number, currency = 'NGN', locale = 'en-NG'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// ─── Strings ──────────────────────────────────────────────────────────────────

/**
 * Truncates a string to a maximum length, appending an ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 3)}...`
}

/**
 * Converts a string to a URL-safe slug.
 * @example slugify('Hello World!') → 'hello-world'
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

/**
 * Formats a number with locale-aware thousands separators.
 * @example formatNumber(1500000) → '1,500,000'
 */
export function formatNumber(n: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(n)
}

/**
 * Returns a compact number string.
 * @example compactNumber(15000) → '15K'
 */
export function compactNumber(n: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { notation: 'compact' }).format(n)
}
