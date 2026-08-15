/**
 * Application-wide constants.
 */

export const APP_NAME = 'SWITCH'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://switchapp.io'

// ─── Pagination ───────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// ─── Cache TTLs (seconds) ─────────────────────────────────────────────────────
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 60 * 5, // 5 minutes
  LONG: 60 * 60, // 1 hour
  DAY: 60 * 60 * 24, // 24 hours
} as const

// ─── HTTP Status Codes ────────────────────────────────────────────────────────
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const

// ─── Routes ───────────────────────────────────────────────────────────────────
export const ROUTES = {
  HOME: '/',
  EVENTS: '/events',
  FLIGHTS: '/flights',
  HOTELS: '/hotels',
  CINEMA: '/cinema',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  DASHBOARD: '/dashboard',
  DASHBOARD_PROFILE: '/dashboard/profile',
  DASHBOARD_BOOKINGS: '/dashboard/bookings',
} as const

// ─── Product modules ──────────────────────────────────────────────────────────
export const PRODUCT_MODULES = [
  'events',
  'flights',
  'hotels',
  'bus',
  'cinema',
  'tourism',
  'parking',
  'membership',
] as const
