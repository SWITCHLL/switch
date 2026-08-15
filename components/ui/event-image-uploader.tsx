'use client'

import { useState, useRef, useCallback, useId } from 'react'
import Image from 'next/image'
import { Upload, X, Star, AlertCircle, Loader2, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedImage {
  url: string
  /** true = this is the event's primary banner image */
  isPrimary: boolean
}

interface EventImageUploaderProps {
  /** Called whenever the image list changes. First image in array is the primary. */
  onChange: (urls: string[]) => void
  /** Initial URLs (e.g. when editing an existing event) */
  initialUrls?: string[]
  maxImages?: number
}

const MAX_IMAGES = 6
const MAX_MB = 8
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_LABEL = 'JPEG, PNG, WebP, or GIF · max 8 MB each'

// ─── Component ────────────────────────────────────────────────────────────────

export function EventImageUploader({
  onChange,
  initialUrls = [],
  maxImages = MAX_IMAGES,
}: EventImageUploaderProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [images, setImages] = useState<UploadedImage[]>(() =>
    initialUrls.map((url, i) => ({ url, isPrimary: i === 0 }))
  )
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Notify parent whenever images change
  function notify(next: UploadedImage[]) {
    // Primary is always index 0; maintain that invariant
    onChange(next.map((img) => img.url))
  }

  // ── Upload handler ──────────────────────────────────────────────────────────

  const upload = useCallback(
    async (files: FileList | File[]) => {
      setError(null)
      const fileArr = Array.from(files)

      if (!fileArr.length) return

      // Client-side validation
      for (const f of fileArr) {
        if (!ALLOWED_TYPES.includes(f.type)) {
          setError(`"${f.name}" is not a supported image type. Use JPEG, PNG, WebP, or GIF.`)
          return
        }
        if (f.size > MAX_MB * 1024 * 1024) {
          setError(`"${f.name}" is too large. Maximum file size is ${MAX_MB} MB.`)
          return
        }
      }

      const remaining = maxImages - images.length
      if (fileArr.length > remaining) {
        setError(
          `You can only add ${remaining} more image${remaining === 1 ? '' : 's'} (max ${maxImages}).`
        )
        return
      }

      setIsUploading(true)
      const fd = new FormData()
      fileArr.forEach((f) => fd.append('files', f))

      try {
        const res = await fetch('/api/upload/event-images', {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as { urls?: string[]; error?: string }

        if (!res.ok || json.error) {
          setError(json.error ?? 'Upload failed. Please try again.')
          return
        }

        setImages((prev) => {
          const next = [
            ...prev,
            ...(json.urls ?? []).map((url, i) => ({
              url,
              isPrimary: prev.length === 0 && i === 0,
            })),
          ]
          notify(next)
          return next
        })
      } catch {
        setError('Network error — could not upload images. Please try again.')
      } finally {
        setIsUploading(false)
        // Reset file input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [images.length, maxImages]
  )

  // ── Remove image ────────────────────────────────────────────────────────────

  function remove(url: string) {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.url !== url)
      // If removed image was primary, promote next one
      const next =
        filtered.length > 0 && !filtered.some((img) => img.isPrimary)
          ? filtered.map((img, i) => ({ ...img, isPrimary: i === 0 }))
          : filtered
      notify(next)
      return next
    })
  }

  // ── Set primary ─────────────────────────────────────────────────────────────

  function setPrimary(url: string) {
    setImages((prev) => {
      // Move selected to front, mark as primary
      const target = prev.find((img) => img.url === url)
      if (!target) return prev
      const rest = prev.filter((img) => img.url !== url)
      const next = [
        { ...target, isPrimary: true },
        ...rest.map((img) => ({ ...img, isPrimary: false })),
      ]
      notify(next)
      return next
    })
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files)
  }

  const canAddMore = images.length < maxImages && !isUploading

  return (
    <div className="space-y-3">
      {/* ── Drop zone (shown when under the limit) ── */}
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload event images"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 transition-colors',
            isDragging
              ? 'border-brand-500 bg-brand-500/5'
              : 'border-border hover:border-brand-500/50 hover:bg-muted/30'
          )}
        >
          {isUploading ? (
            <Loader2 className="text-brand-400 h-8 w-8 animate-spin" />
          ) : (
            <div className="bg-brand-500/10 flex h-12 w-12 items-center justify-center rounded-xl">
              <ImagePlus className="text-brand-400 h-6 w-6" />
            </div>
          )}
          <div className="text-center">
            <p className="text-[13.5px] font-medium">
              {isUploading ? 'Uploading…' : 'Drop images here or click to browse'}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[12px]">{ALLOWED_LABEL}</p>
            <p className="text-muted-foreground text-[12px]">
              {images.length} / {maxImages} uploaded
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files)
        }}
        aria-hidden="true"
      />

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto shrink-0 hover:opacity-70"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Image grid ── */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.url}
              className={cn(
                'group relative aspect-video overflow-hidden rounded-xl border-2 transition-all',
                img.isPrimary ? 'border-brand-500' : 'border-border'
              )}
            >
              <Image
                src={img.url}
                alt="Event image"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
                unoptimized={img.url.startsWith('blob:')}
              />

              {/* Primary badge */}
              {img.isPrimary && (
                <div className="bg-brand-600 absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  <Star className="h-2.5 w-2.5" />
                  Primary
                </div>
              )}

              {/* Overlay controls — shown on hover */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(img.url)}
                    className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                  >
                    <Star className="h-3 w-3" />
                    Set as primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(img.url)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500/80 px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-red-500"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Add more slot */}
          {canAddMore && images.length > 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-border hover:border-brand-500/50 hover:bg-muted/30 flex aspect-video items-center justify-center rounded-xl border-2 border-dashed transition-colors"
            >
              <Upload className="text-muted-foreground h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* ── Helper text ── */}
      {images.length > 0 && (
        <p className="text-muted-foreground text-[11.5px]">
          The <span className="text-brand-400 font-medium">primary</span> image is shown as the
          event banner. Click an image to set it as primary or remove it.
        </p>
      )}
    </div>
  )
}
