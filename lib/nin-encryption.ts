/**
 * NIN Encryption Utilities
 *
 * Encrypts/decrypts National Identification Numbers at rest using
 * AES-256-GCM with a server-side key from the environment.
 *
 * The encrypted format stored in the DB is:
 *   <iv_hex>:<authTag_hex>:<ciphertext_hex>
 *
 * Environment variable required:
 *   NIN_ENCRYPTION_KEY — 64 hex characters (32 bytes / 256 bits)
 *   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_BYTE_LENGTH = 32
const IV_BYTE_LENGTH = 12 // 96-bit IV recommended for GCM

function getKey(): Buffer {
  const raw = process.env.NIN_ENCRYPTION_KEY
  if (!raw) throw new Error('NIN_ENCRYPTION_KEY is not set')
  if (raw.length !== KEY_BYTE_LENGTH * 2) {
    throw new Error('NIN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
  }
  return Buffer.from(raw, 'hex')
}

/**
 * Encrypts a plaintext NIN string.
 * Returns a compact colon-separated string: iv:authTag:ciphertext (all hex).
 */
export function encryptNin(nin: string): string {
  const key = getKey()
  const iv = randomBytes(IV_BYTE_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(nin, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts a previously encrypted NIN string.
 * Returns the plaintext NIN, or throws if the ciphertext is tampered.
 */
export function decryptNin(encrypted: string): string {
  const key = getKey()
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted NIN format')

  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string]
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
