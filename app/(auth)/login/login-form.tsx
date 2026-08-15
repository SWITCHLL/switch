'use client'

import { useActionState, useState } from 'react'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendOtpAction, verifyOtpAction, type SendOtpState, type VerifyOtpState } from './actions'

// ─── Step 1: Email Form ───────────────────────────────────────────────────────

function EmailStep({ onSuccess }: { onSuccess: (email: string) => void }) {
  const initialState: SendOtpState = { status: 'idle' }

  const [state, action, pending] = useActionState(
    async (prev: SendOtpState, formData: FormData): Promise<SendOtpState> => {
      const result = await sendOtpAction(prev, formData)
      if (result.status === 'success') {
        onSuccess(result.email)
      }
      return result
    },
    initialState
  )

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-foreground block text-sm font-medium">
          Email address
        </label>
        <div className="relative">
          <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            className="pl-9"
            aria-describedby={
              state.status === 'error' && state.fieldErrors?.email ? 'email-error' : undefined
            }
            aria-invalid={
              state.status === 'error' && Boolean(state.fieldErrors?.email) ? true : undefined
            }
          />
        </div>
        {state.status === 'error' && state.fieldErrors?.email && (
          <p id="email-error" className="text-sm text-red-500" role="alert">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      {state.status === 'error' && !state.fieldErrors && (
        <p className="text-sm text-red-500" role="alert">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Sending code…
          </>
        ) : (
          'Send login code'
        )}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        We&apos;ll email you a 6-digit code to sign in — no password needed.
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
      {/* Hidden email field — passed through to the server action */}
      <input type="hidden" name="email" value={email} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="otp" className="text-foreground block text-sm font-medium">
            6-digit code
          </label>
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            aria-label="Go back to email step"
          >
            <ArrowLeft className="h-3 w-3" />
            Change email
          </button>
        </div>

        <p className="text-muted-foreground text-sm">
          We sent a code to <span className="text-foreground font-medium">{email}</span>
        </p>

        <Input
          id="otp"
          name="otp"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          autoComplete="one-time-code"
          autoFocus
          className="text-center font-mono text-lg tracking-[0.5em]"
          aria-describedby={
            state.status === 'error' && state.fieldErrors?.otp ? 'otp-error' : undefined
          }
          aria-invalid={
            state.status === 'error' && Boolean(state.fieldErrors?.otp) ? true : undefined
          }
        />
        {state.status === 'error' && state.fieldErrors?.otp && (
          <p id="otp-error" className="text-sm text-red-500" role="alert">
            {state.fieldErrors.otp[0]}
          </p>
        )}
      </div>

      {state.status === 'error' && !state.fieldErrors && (
        <p className="text-sm text-red-500" role="alert">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Verifying…
          </>
        ) : (
          'Sign in'
        )}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        Didn&apos;t receive a code? Check your spam folder or{' '}
        <button type="button" onClick={onBack} className="text-brand-600 hover:underline">
          try again
        </button>
        .
      </p>
    </form>
  )
}

// ─── Root Form Component ──────────────────────────────────────────────────────

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

  return (
    <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
      {step === 'email' ? (
        <EmailStep onSuccess={handleEmailSuccess} />
      ) : (
        <OtpStep email={email} onBack={handleBack} />
      )}
    </div>
  )
}
