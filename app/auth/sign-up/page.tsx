'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Eye, EyeOff, Mail, Lock, User,
  AlertCircle, ArrowRight, Loader2, CheckCircle2,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'

// ─── Password strength ────────────────────────────────────────

function getPasswordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pw)          return { score: 0, label: '',       color: '' }
  let score = 0
  if (pw.length >= 8)          score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Weak',      color: 'bg-red-500'    },
    2: { label: 'Fair',      color: 'bg-amber-500'  },
    3: { label: 'Good',      color: 'bg-blue-500'   },
    4: { label: 'Strong',    color: 'bg-emerald-500' },
  }
  return { score: score as 0 | 1 | 2 | 3 | 4, ...(map[score] ?? { label: '', color: '' }) }
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password)
  if (!password) return null
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-1"
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i <= score ? color : 'bg-muted')}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: i * 0.05 }}
            style={{ originX: 0 }}
          />
        ))}
      </div>
      {label && (
        <p className={cn('text-[10px] font-medium', score >= 3 ? 'text-emerald-500' : score === 2 ? 'text-amber-500' : 'text-red-500')}>
          {label} password
        </p>
      )}
    </motion.div>
  )
}

// ─── Input (reused pattern from sign-in) ─────────────────────

function AuthInput({
  id, label, type, value, onChange, error,
  placeholder, autoComplete, icon: Icon, suffix,
}: {
  id: string; label: string; type: string; value: string
  onChange: (v: string) => void; error?: string
  placeholder?: string; autoComplete?: string
  icon: React.ElementType; suffix?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-foreground/80 uppercase tracking-widest">
        {label}
      </label>
      <div className={cn(
        'relative flex items-center rounded-xl border transition-all duration-200',
        focused ? 'border-primary/60 shadow-sm shadow-primary/10 bg-background'
        : error  ? 'border-destructive/60 bg-destructive/5'
        : 'border-border bg-card hover:border-border/70',
      )}>
        <Icon className={cn('absolute left-3.5 w-4 h-4 pointer-events-none transition-colors', focused ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
        <input
          id={id} type={type} value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder} autoComplete={autoComplete}
          className="w-full pl-10 pr-10 py-2.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
        />
        {suffix && <div className="absolute right-3">{suffix}</div>}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p id={`${id}-error`} role="alert"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-1.5 text-[11px] text-destructive"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">or</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ─── Validation ───────────────────────────────────────────────

function validate(name: string, email: string, password: string, confirm: string) {
  const e: Record<string, string> = {}
  if (!name.trim())               e.name     = 'Name is required.'
  else if (name.trim().length < 2) e.name    = 'Name must be at least 2 characters.'
  if (!email)                     e.email    = 'Email is required.'
  else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address.'
  if (!password)                  e.password = 'Password is required.'
  else if (password.length < 8)   e.password = 'Password must be at least 8 characters.'
  if (!confirm)                   e.confirm  = 'Please confirm your password.'
  else if (confirm !== password)  e.confirm  = 'Passwords do not match.'
  return e
}

// ─── Page ─────────────────────────────────────────────────────

export default function SignUpPage() {
  const router  = useRouter()
  const params  = useSearchParams()
  const next    = params.get('next') ?? '/'

  const { signUpEmail, signInWithOAuth, status, error, clearError } = useAuthStore()

  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)

  const isSubmitting = status === 'loading' && !oauthLoading

  const clearField = (key: string) =>
    setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    const errors = validate(name, email, password, confirm)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    try {
      await signUpEmail({ name: name.trim(), email, password })
      router.replace(next)
    } catch {
      // Error shown via store
    }
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    clearError()
    setOauthLoading(provider)
    try {
      await signInWithOAuth(provider)
    } catch {
      setOauthLoading(null)
    }
  }

  const SocialBtn = ({ provider, label, icon }: { provider: 'google' | 'github'; label: string; icon: React.ReactNode }) => (
    <motion.button
      type="button"
      onClick={() => handleOAuth(provider)}
      disabled={!!oauthLoading}
      whileHover={!oauthLoading ? { scale: 1.02, y: -1 } : undefined}
      whileTap={!oauthLoading ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn(
        'w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl',
        'border border-border bg-card text-sm font-medium text-foreground',
        'hover:bg-muted/60 transition-colors',
        oauthLoading && 'opacity-60 cursor-not-allowed',
      )}
      aria-label={`Sign up with ${label}`}
    >
      {oauthLoading === provider ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      <span>Continue with {label}</span>
    </motion.button>
  )

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-muted/30 border-r border-border flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative text-center space-y-6 max-w-xs"
        >
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-primary/25">
            <Zap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Start learning faster
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Join thousands of developers who debug smarter and level up faster with TraceLearn.ai.
            </p>
          </div>

          {[
            'Free to start — no credit card',
            'AI explains every error in plain English',
            'Track your learning progress over time',
            'Export reports as PDF or presentation',
          ].map((f, i) => (
            <motion.div
              key={f}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07, duration: 0.3 }}
              className="flex items-center gap-2.5 text-left"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden="true" />
              <span className="text-xs text-foreground/80">{f}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Right: form ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px] space-y-6"
        >
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Start analyzing and learning in seconds.
            </p>
          </div>

          {/* Social buttons */}
          <div className="space-y-2.5">
            <SocialBtn provider="google" label="Google" icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            }/>
            <SocialBtn provider="github" label="GitHub" icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            }/>
          </div>

          <Divider />

          {/* Global error */}
          <AnimatePresence>
            {error && (
              <motion.div role="alert"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/8 border border-destructive/20 text-sm text-destructive"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <AuthInput id="name" label="Full name" type="text" value={name}
              onChange={(v) => { setName(v); clearField('name') }}
              error={fieldErrors.name} placeholder="Jane Smith"
              autoComplete="name" icon={User}
            />
            <AuthInput id="email" label="Email" type="email" value={email}
              onChange={(v) => { setEmail(v); clearField('email') }}
              error={fieldErrors.email} placeholder="you@example.com"
              autoComplete="email" icon={Mail}
            />
            <div className="space-y-2">
              <AuthInput id="password" label="Password"
                type={showPw ? 'text' : 'password'} value={password}
                onChange={(v) => { setPassword(v); clearField('password') }}
                error={fieldErrors.password} placeholder="Min. 8 characters"
                autoComplete="new-password" icon={Lock}
                suffix={
                  <button type="button" onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                }
              />
              <AnimatePresence>
                {password && <PasswordStrengthBar password={password} />}
              </AnimatePresence>
            </div>
            <AuthInput id="confirm" label="Confirm password"
              type={showConfirm ? 'text' : 'password'} value={confirm}
              onChange={(v) => { setConfirm(v); clearField('confirm') }}
              error={fieldErrors.confirm} placeholder="Repeat your password"
              autoComplete="new-password" icon={Lock}
              suffix={
                <button type="button" onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              }
            />

            <motion.button type="submit" disabled={isSubmitting}
              whileHover={!isSubmitting ? { scale: 1.01, y: -1 } : undefined}
              whileTap={!isSubmitting ? { scale: 0.98 } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl',
                'bg-primary text-primary-foreground text-sm font-semibold',
                'hover:bg-primary/90 transition-colors',
                'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
                isSubmitting && 'opacity-70 cursor-not-allowed',
              )}
              aria-busy={isSubmitting}
            >
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</>
                : <><span>Create account</span><ArrowRight className="w-4 h-4" /></>
              }
            </motion.button>

            <p className="text-center text-xs text-muted-foreground">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </form>

          {/* Sign in link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href={`/auth/sign-in${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}