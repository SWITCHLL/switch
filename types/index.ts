/**
 * Global type definitions for the SWITCH platform.
 *
 * Domain-specific types live in their respective feature directories:
 *   features/events/types.ts
 *   features/tickets/types.ts
 *   etc.
 */

// ─── Common ───────────────────────────────────────────────────────────────────

export type ID = string

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

/** Generic paginated API response */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/** Standard API error shape */
export interface ApiError {
  message: string
  code?: string
  statusCode: number
  errors?: Record<string, string[]>
}

/** Standard API success response */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: ApiError
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'USER' | 'ORGANIZER' | 'ADMIN'

export interface User {
  id: ID
  name: string | null
  email: string
  image: string | null
  role: UserRole
  createdAt: Date
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface NavItem {
  title: string
  href: string
  disabled?: boolean
  external?: boolean
  icon?: React.ComponentType<{ className?: string }>
  label?: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

// ─── Feature modules (placeholder shapes) ─────────────────────────────────────

export type ProductModule =
  'events' | 'flights' | 'hotels' | 'bus' | 'cinema' | 'tourism' | 'parking' | 'membership'
