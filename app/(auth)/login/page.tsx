import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your SWITCH account.',
}

// ─── Hardcoded particle positions (SSR-safe) ──────────────────────────────────
const DOTS = [
  { top: 6,  left: 5,  s: 5, o: 0.85 }, { top: 18, left: 11, s: 3, o: 0.65 },
  { top: 35, left: 3,  s: 6, o: 0.80 }, { top: 52, left: 8,  s: 4, o: 0.70 },
  { top: 70, left: 4,  s: 5, o: 0.82 }, { top: 84, left: 14, s: 3, o: 0.60 },
  { top: 92, left: 7,  s: 6, o: 0.75 }, { top: 10, left: 22, s: 3, o: 0.65 },
  { top: 45, left: 18, s: 5, o: 0.78 }, { top: 78, left: 24, s: 4, o: 0.70 },
  { top: 8,  left: 75, s: 5, o: 0.85 }, { top: 22, left: 82, s: 3, o: 0.65 },
  { top: 38, left: 92, s: 6, o: 0.80 }, { top: 55, left: 87, s: 4, o: 0.72 },
  { top: 68, left: 95, s: 5, o: 0.82 }, { top: 82, left: 78, s: 3, o: 0.60 },
  { top: 90, left: 88, s: 6, o: 0.78 }, { top: 14, left: 68, s: 3, o: 0.62 },
  { top: 42, left: 76, s: 5, o: 0.80 }, { top: 74, left: 70, s: 4, o: 0.68 },
  { top: 5,  left: 48, s: 3, o: 0.55 }, { top: 95, left: 52, s: 4, o: 0.65 },
]

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16"
      style={{ backgroundColor: '#08080f' }}
    >
      {/* ── Red/orange blob — left ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: '-10%', left: '-18%',
          width: '65%', height: '110%',
          background: 'radial-gradient(ellipse at 35% 45%, rgba(192,40,10,0.65) 0%, rgba(120,20,0,0.38) 38%, transparent 70%)',
          filter: 'blur(12px)',
        }}
      />

      {/* ── Purple/violet blob — right ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: '-15%', right: '-18%',
          width: '62%', height: '110%',
          background: 'radial-gradient(ellipse at 65% 40%, rgba(109,40,217,0.62) 0%, rgba(60,10,130,0.38) 38%, transparent 70%)',
          filter: 'blur(12px)',
        }}
      />

      {/* ── Grain texture ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          opacity: 0.04,
          mixBlendMode: 'overlay',
        }}
      />

      {/* ── Particles ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: 2 }}>
        {DOTS.map((d, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: `${d.top}%`,
              left: `${d.left}%`,
              width: `${d.s}px`,
              height: `${d.s}px`,
              borderRadius: '50%',
              backgroundColor: '#fff',
              opacity: d.o,
              display: 'block',
              boxShadow: d.s >= 5 ? `0 0 ${d.s * 3}px ${d.s}px rgba(255,255,255,0.30)` : undefined,
            }}
          />
        ))}
      </div>

      {/* ── Edge vignette ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 3,
          background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 40%, rgba(8,8,15,0.80) 100%)',
        }}
      />

      {/* ── Card ── */}
      <div className="relative w-full max-w-[400px]" style={{ zIndex: 10 }}>

        {/* Back to home */}
        <Link
          href="/"
          className="mb-8 flex items-center gap-1.5 text-[12px] font-medium text-white/40 transition-colors hover:text-white/70"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to SWITCH
        </Link>

        {/* Eyebrow */}
        <p
          className="mb-3 text-[10px] font-semibold tracking-[0.28em] uppercase"
          style={{ color: 'rgba(251,146,60,0.65)' }}
        >
          [ WELCOME BACK ]
        </p>

        {/* Heading */}
        <h1 className="mb-2 text-[32px] font-bold leading-tight tracking-tight text-white">
          Sign in to<br />
          <span style={{ color: '#c084fc' }}>SWITCH</span>
        </h1>

        <p className="mb-8 text-[14px] text-white/45">
          Enter your email — we&apos;ll send you a code.
        </p>

        {/* Form */}
        <LoginForm />

        {/* Footer */}
        <p className="mt-6 text-center text-[12px] text-white/30">
          By signing in you agree to our{' '}
          <Link href="/privacy" className="text-white/50 underline underline-offset-2 hover:text-white/70 transition-colors">
            Privacy Policy
          </Link>
          {' '}and{' '}
          <Link href="/cookies" className="text-white/50 underline underline-offset-2 hover:text-white/70 transition-colors">
            Terms
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
