import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your SWITCH account.',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Brand */}
        <div className="space-y-2 text-center">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">SWITCH</h1>
          <p className="text-muted-foreground text-sm">Enter your email to get started</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
