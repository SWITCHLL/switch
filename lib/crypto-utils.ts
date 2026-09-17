/**
 * Server-only cryptographic utilities.
 * Wraps bcryptjs and Node's crypto module so they are never bundled
 * into client-side code.
 */
import 'server-only'
import { hash, compare } from 'bcryptjs'
import { randomBytes as nodeRandomBytes } from 'node:crypto'

export async function hashPassword(password: string, rounds = 10): Promise<string> {
  return hash(password, rounds)
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed)
}

export function generateToken(byteLength = 32): string {
  return nodeRandomBytes(byteLength).toString('hex')
}

export function generateTicketNumber(): string {
  const year = new Date().getFullYear()
  const hex = nodeRandomBytes(3).toString('hex').toUpperCase()
  return `SWT-${year}-${hex}`
}

export function generateQrCode(): string {
  return nodeRandomBytes(32).toString('hex')
}
