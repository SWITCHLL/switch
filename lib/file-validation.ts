/**
 * Server-side file validation utilities.
 *
 * Validates MIME types by reading the file's magic bytes rather than trusting
 * the client-supplied Content-Type header, which can be trivially spoofed.
 *
 * Uses `file-type` (ESM-only, Node.js ≥18) for magic byte detection.
 */
import 'server-only'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

/**
 * Validates a file's MIME type by inspecting its magic bytes.
 *
 * @param buffer  Raw file bytes
 * @param allowed Allowlist of MIME types
 * @returns The detected MIME type on success, or an error string if rejected.
 */
export async function detectMimeType(
  buffer: Buffer,
  allowed: readonly string[]
): Promise<{ mime: string } | { error: string }> {
  // Dynamic import — file-type is ESM-only
  const { fileTypeFromBuffer } = await import('file-type')
  const result = await fileTypeFromBuffer(buffer)

  if (!result) {
    return { error: 'Could not detect file type. Please upload a valid image.' }
  }

  if (!allowed.includes(result.mime)) {
    return {
      error: `File type "${result.mime}" is not allowed. Use JPEG, PNG, WebP, or GIF.`,
    }
  }

  return { mime: result.mime }
}

export { ALLOWED_IMAGE_TYPES }
