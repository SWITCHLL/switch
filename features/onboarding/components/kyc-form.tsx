'use client'

import { useState, useTransition } from 'react'
import {
  User,
  ShieldCheck,
  Link2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  Instagram,
  Twitter,
  Facebook,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitOrganizerApplication } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  // Step 1
  organizerName: string
  bio: string
  // Step 2
  nin: string
  bvn: string
  idType: string
  idDocUrl: string
  // Step 3
  instagramUrl: string
  twitterUrl: string
  facebookUrl: string
  websiteUrl: string
}

interface FieldError {
  [key: string]: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ID_TYPES = [
  { value: 'NATIONAL_ID', label: 'National ID Card' },
  { value: 'DRIVERS_LICENSE', label: "Driver's License" },
  { value: 'INTL_PASSPORT', label: 'International Passport' },
  { value: 'VOTERS_CARD', label: "Voter's Card" },
]

const STEPS = [
  { id: 1, label: 'Profile', icon: User },
  { id: 2, label: 'Identity', icon: ShieldCheck },
  { id: 3, label: 'Socials', icon: Link2 },
]

// ─── Shared input class ───────────────────────────────────────────────────────

const inputCls = (hasError: boolean) =>
  cn(
    'w-full rounded-xl border bg-surface px-3.5 py-2.5',
    'text-[14px] text-foreground placeholder:text-muted-foreground',
    'outline-none transition-colors focus:ring-2',
    hasError
      ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
      : 'border-border focus:border-brand-500 focus:ring-brand-500/20'
  )

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateStep(step: number, state: FormState): FieldError {
  const errors: FieldError = {}

  if (step === 1) {
    if (!state.organizerName.trim()) {
      errors.organizerName = 'Organizer name is required'
    } else if (state.organizerName.trim().length < 2) {
      errors.organizerName = 'Name must be at least 2 characters'
    } else if (state.organizerName.trim().length > 100) {
      errors.organizerName = 'Name must be at most 100 characters'
    }
    if (state.bio && state.bio.length > 1000) {
      errors.bio = 'Bio must be at most 1000 characters'
    }
  }

  if (step === 2) {
    if (!/^\d{11}$/.test(state.nin)) {
      errors.nin = 'NIN must be exactly 11 digits'
    }
    if (!/^\d{11}$/.test(state.bvn)) {
      errors.bvn = 'BVN must be exactly 11 digits'
    }
    if (!state.idType) {
      errors.idType = 'Please select an ID type'
    }
    if (!state.idDocUrl.trim()) {
      errors.idDocUrl = 'Please provide your ID document URL'
    }
  }

  if (step === 3) {
    const urlFields: (keyof FormState)[] = [
      'instagramUrl',
      'twitterUrl',
      'facebookUrl',
      'websiteUrl',
    ]
    urlFields.forEach((field) => {
      const val = state[field] as string
      if (val && val.trim()) {
        try {
          new URL(val.trim())
        } catch {
          errors[field] = 'Please enter a valid URL (include https://)'
        }
      }
    })
  }

  return errors
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KycForm() {
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<FieldError>({})
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState<FormState>({
    organizerName: '',
    bio: '',
    nin: '',
    bvn: '',
    idType: '',
    idDocUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    facebookUrl: '',
    websiteUrl: '',
  })

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear field error on change
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function handleNext() {
    const errors = validateStep(step, form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setStep((s) => s + 1)
  }

  function handleBack() {
    setFieldErrors({})
    setStep((s) => s - 1)
  }

  function handleSubmit() {
    const errors = validateStep(3, form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitError('')
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v) fd.append(k, v)
    })

    startTransition(async () => {
      const result = await submitOrganizerApplication(fd)
      if (result.success) {
        setSubmitted(true)
      } else {
        setSubmitError(result.error)
      }
    })
  }

  if (submitted) {
    return <SuccessState />
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* ── Stepper ── */}
      <div className="mb-8 flex items-center justify-center gap-0">
        {STEPS.map((s, i) => {
          const isDone = step > s.id
          const isActive = step === s.id

          return (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all',
                    isDone
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : isActive
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-border text-muted-foreground'
                  )}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    isActive ? 'text-brand-400' : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-3 mb-5 h-px w-16 transition-colors',
                    step > s.id ? 'bg-brand-500' : 'bg-border'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Card ── */}
      <div className="border-border bg-surface rounded-2xl border p-6">
        {step === 1 && <StepProfile form={form} set={set} errors={fieldErrors} />}
        {step === 2 && <StepIdentity form={form} set={set} errors={fieldErrors} />}
        {step === 3 && <StepSocials form={form} set={set} errors={fieldErrors} />}

        {/* Submit error */}
        {submitError && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {submitError}
          </div>
        )}

        {/* Navigation */}
        <div className={cn('mt-6 flex', step > 1 ? 'justify-between' : 'justify-end')}>
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isPending}
              className="border-border hover:bg-muted/50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13.5px] font-medium transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="from-brand-600 flex items-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className={cn(
                'flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity',
                isPending
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'from-brand-600 bg-gradient-to-r to-violet-600 hover:opacity-90'
              )}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Application
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 1: Profile ──────────────────────────────────────────────────────────

function StepProfile({
  form,
  set,
  errors,
}: {
  form: FormState
  set: (k: keyof FormState, v: string) => void
  errors: FieldError
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-semibold">Organizer Profile</h2>
        <p className="text-muted-foreground mt-1 text-[13px]">
          How you&apos;ll appear to attendees on your event pages.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium">
          Organizer Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.organizerName}
          onChange={(e) => set('organizerName', e.target.value)}
          placeholder="e.g. Lagos Music Collective"
          maxLength={100}
          className={inputCls(!!errors.organizerName)}
        />
        {errors.organizerName && <p className="text-[12px] text-red-500">{errors.organizerName}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium">Bio</label>
        <textarea
          value={form.bio}
          onChange={(e) => set('bio', e.target.value)}
          placeholder="Tell attendees a bit about your organization or the types of events you run…"
          maxLength={1000}
          rows={4}
          className={cn(inputCls(!!errors.bio), 'resize-none')}
        />
        <div className="flex justify-between">
          {errors.bio ? <p className="text-[12px] text-red-500">{errors.bio}</p> : <span />}
          <span className="text-muted-foreground text-[11px]">{form.bio.length}/1000</span>
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Identity ─────────────────────────────────────────────────────────

function StepIdentity({
  form,
  set,
  errors,
}: {
  form: FormState
  set: (k: keyof FormState, v: string) => void
  errors: FieldError
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-semibold">Identity Verification</h2>
        <p className="text-muted-foreground mt-1 text-[13px]">
          Required to verify your identity before you can host paid events. Your data is encrypted
          and handled securely.
        </p>
      </div>

      {/* NIN */}
      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium">
          NIN (National Identification Number) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={form.nin}
          onChange={(e) => set('nin', e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="11-digit NIN"
          maxLength={11}
          className={inputCls(!!errors.nin)}
        />
        {errors.nin ? (
          <p className="text-[12px] text-red-500">{errors.nin}</p>
        ) : (
          <p className="text-muted-foreground text-[11.5px]">
            Found on your National ID card or NIN slip.
          </p>
        )}
      </div>

      {/* BVN */}
      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium">
          BVN (Bank Verification Number) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={form.bvn}
          onChange={(e) => set('bvn', e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="11-digit BVN"
          maxLength={11}
          className={inputCls(!!errors.bvn)}
        />
        {errors.bvn ? (
          <p className="text-[12px] text-red-500">{errors.bvn}</p>
        ) : (
          <p className="text-muted-foreground text-[11.5px]">
            Dial *565*0# on your registered phone number to retrieve your BVN.
          </p>
        )}
      </div>

      {/* ID Type */}
      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium">
          Means of Identification <span className="text-red-500">*</span>
        </label>
        <select
          value={form.idType}
          onChange={(e) => set('idType', e.target.value)}
          className={cn(inputCls(!!errors.idType), 'cursor-pointer')}
        >
          <option value="">Select ID type…</option>
          {ID_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {errors.idType && <p className="text-[12px] text-red-500">{errors.idType}</p>}
      </div>

      {/* ID Document URL */}
      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium">
          ID Document <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Upload className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <input
            type="url"
            value={form.idDocUrl}
            onChange={(e) => set('idDocUrl', e.target.value)}
            placeholder="https://… (upload to your storage and paste URL)"
            className={cn(inputCls(!!errors.idDocUrl), 'pl-9')}
          />
        </div>
        {errors.idDocUrl ? (
          <p className="text-[12px] text-red-500">{errors.idDocUrl}</p>
        ) : (
          <p className="text-muted-foreground text-[11.5px]">
            Upload a clear photo or scan of your ID to a file host (e.g. Google Drive, Dropbox) and
            paste the public link here.
          </p>
        )}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <p className="text-[12.5px] text-emerald-500/80">
          Your identity documents are reviewed only by our compliance team and are never shared with
          third parties.
        </p>
      </div>
    </div>
  )
}

// ─── Step 3: Socials ──────────────────────────────────────────────────────────

function StepSocials({
  form,
  set,
  errors,
}: {
  form: FormState
  set: (k: keyof FormState, v: string) => void
  errors: FieldError
}) {
  const fields = [
    {
      key: 'instagramUrl' as const,
      label: 'Instagram',
      icon: Instagram,
      placeholder: 'https://instagram.com/yourpage',
    },
    {
      key: 'twitterUrl' as const,
      label: 'X / Twitter',
      icon: Twitter,
      placeholder: 'https://x.com/yourhandle',
    },
    {
      key: 'facebookUrl' as const,
      label: 'Facebook',
      icon: Facebook,
      placeholder: 'https://facebook.com/yourpage',
    },
    {
      key: 'websiteUrl' as const,
      label: 'Website',
      icon: Globe,
      placeholder: 'https://yourwebsite.com',
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-semibold">Social Handles</h2>
        <p className="text-muted-foreground mt-1 text-[13px]">
          All optional — but adding social links builds trust with attendees and speeds up review.
        </p>
      </div>

      {fields.map(({ key, label, icon: Icon, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <label className="block text-[13px] font-medium">{label}</label>
          <div className="relative">
            <Icon className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              type="url"
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              className={cn(inputCls(!!errors[key]), 'pl-9')}
            />
          </div>
          {errors[key] && <p className="text-[12px] text-red-500">{errors[key]}</p>}
        </div>
      ))}

      {/* Review info banner */}
      <div className="border-border bg-muted/30 rounded-xl border px-4 py-3.5">
        <p className="text-[13px] font-medium">What happens next?</p>
        <ul className="text-muted-foreground mt-2 space-y-1.5 text-[12.5px]">
          <li className="flex items-start gap-2">
            <span className="text-brand-400 mt-0.5 shrink-0">1.</span>
            Our compliance team reviews your application within 1–3 business days.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-400 mt-0.5 shrink-0">2.</span>
            You&apos;ll receive an email once your account is approved or if we need more
            information.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-400 mt-0.5 shrink-0">3.</span>
            Once approved, you can immediately start creating and publishing paid events.
          </li>
        </ul>
      </div>
    </div>
  )
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </div>
      <h2 className="text-[20px] font-semibold">Application submitted</h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-[14px]">
        We&apos;ve received your KYC application. Our team will review it within 1–3 business days
        and notify you by email.
      </p>
      <a
        href="/dashboard"
        className="from-brand-600 mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Back to Dashboard
      </a>
    </div>
  )
}
