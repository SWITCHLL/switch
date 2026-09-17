'use client'

import { useActionState, useState } from 'react'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import { sendOtpAction, verifyOtpAction, type SendOtpState, type VerifyOtpState } from './actions'

// ─── Shared input style ───────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white placeholder:text-white/25 ' +
  'backdrop-blur-sm outline-none transition-all duration-200 ' +
  'focus:border-white/30 focus:bg-white/8 focus:ring-2 focus:ring-white/10 ' +
  'aria-invalid:border-red-500/60 aria-invalid:ring-red-500/10'

const btnPrimaryCls =
  'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white ' +
  'transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400'

// ─── Step 1: Email Form ───────────────────────────────────────────────────────

function EmailStep({ onSuccess }: { onSuccess: (email: string) => void }) {
  const initialState: SendOtpState = { status: 'idle' }

  const [state, action, pending] = useActionState(
    async (prev: SendOtpState, formData: FormData): Promise<SendOtpState> => {
      const result = await sendOtpAction(prev, formData)
      if (result.status === 'success') onSuccess(result.email)
      return result
    },
    initialState
  )

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-[13px] font-medium text-white/70">
          Email address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            className={`${inputCls} pl-10`}
            aria-describedby={
              state.status === 'error' && state.fieldErrors?.email ? 'email-error' : undefined
            }
            aria-invalid={
              state.status === 'error' && Boolean(state.fieldErrors?.email) ? true : undefined
            }
          />
        </div>
        {state.status === 'error' && state.fieldErrors?.email && (
          <p id="email-error" className="text-[12px] text-red-400" role="alert">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      {state.status === 'error' && !state.fieldErrors && (
        <p className="text-[12px] text-red-400" role="alert">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={btnPrimaryCls}
        style={{ background: 'linear-gradient(135deg, #e8430a 0%, #c0280a 100%)' }}
      >
        {pending ? (
          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Sending code…</>
        ) : (
          'Send login code'
        )}
      </button>

      <p className="text-center text-[12px] text-white/30">
        We&apos;ll email a 6-digit code — no password needed.
      </p>
    </form>
  )
}

// ─── Step 2: OTP Form ─────────────────────────────────────────────────────────

function OtpStep({ email, onBack }: { email: string; onBack: () => void }) {
  const initialState: VerifyOtpState = { status: 'idle' }
  const [state, action, pending] = useActionState(verifyOtpAction, initialState)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="email" value={email} />

      {/* Email confirmation row */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div>
          <p className="text-[11px] text-white/40">Code sent to</p>
          <p className="text-[13px] font-medium text-white">{email}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[12px] font-medium text-white/40 transition-colors hover:text-white/70"
          aria-label="Change email"
        >
          <ArrowLeft className="h-3 w-3" />
          Change
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor="otp" className="block text-[13px] font-medium text-white/70">
          6-digit code
        </label>
        <input
          id="otp"
          name="otp"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          autoComplete="one-time-code"
          autoFocus
          className={`${inputCls} text-center font-mono text-[22px] tracking-[0.6em]`}
          aria-describedby={
            state.status === 'error' && state.fieldErrors?.otp ? 'otp-error' : undefined
          }
          aria-invalid={
            state.status === 'error' && Boolean(state.fieldErrors?.otp) ? true : undefined
          }
        />
        {state.status === 'error' && state.fieldErrors?.otp && (
          <p id="otp-error" className="text-[12px] text-red-400" role="alert">
            {state.fieldErrors.otp[0]}
          </p>
        )}
      </div>

      {state.status === 'error' && !state.fieldErrors && (
        <p className="text-[12px] text-red-400" role="alert">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={btnPrimaryCls}
        style={{ background: 'linear-gradient(135deg, #e8430a 0%, #c0280a 100%)' }}
      >
        {pending ? (
          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Verifying…</>
        ) : (
          'Sign in →'
        )}
      </button>

      <p className="text-center text-[12px] text-white/30">
        Didn&apos;t get a code? Check spam or{' '}
        <button
          type="button"
          onClick={onBack}
          className="text-white/50 underline underline-offset-2 transition-colors hover:text-white/70"
        >
          try again
        </button>
        .
      </p>
    </form>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function LoginForm() {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')

  function handleEmailSuccess(confirmedEmail: string) {
    setEmail(confirmedEmail)
    setStep('otp')
  }

  function handleBack() {
    setStep('email')
    setEmail('')
  }

  return step === 'email' ? (
    <EmailStep onSuccess={handleEmailSuccess} />
  ) : (
    <OtpStep email={email} onBack={handleBack} />
  )
}
