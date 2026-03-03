'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, User, Github, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

interface Props { next: string; onSuccess: () => void }

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function AuthInput({ id, label, type, value, onChange, placeholder, autoComplete, icon: Icon, suffix, error }: {
  id: string; label: string; type: string; value: string
  onChange: (v: string) => void; placeholder?: string; autoComplete?: string
  icon: React.ElementType; suffix?: React.ReactNode; error?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="space-y-1">
      <label htmlFor={id} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
          style={{ color: focused ? '#06b6d4' : error ? '#f87171' : 'rgba(255,255,255,0.3)' }} />
        <input id={id} type={type} value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={placeholder} autoComplete={autoComplete}
          className="w-full pl-9 pr-9 py-2 text-sm rounded-xl focus:outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : focused ? 'rgba(79,70,229,0.6)' : 'rgba(255,255,255,0.09)'}`,
            color: 'rgba(255,255,255,0.9)',
            boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(239,68,68,0.1)' : 'rgba(79,70,229,0.12)'}` : 'none',
          }}
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number',    pass: /\d/.test(password) },
  ]
  if (!password) return null
  return (
    <div className="flex gap-2 pt-0.5">
      {checks.map(({ label, pass }) => (
        <div key={label} className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full transition-colors"
            style={{ background: pass ? '#10b981' : 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: 10, color: pass ? '#10b981' : 'rgba(255,255,255,0.3)' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

export function SignUpForm({ next, onSuccess }: Props) {
  const { signUpEmail, signInWithOAuth, status, error, clearError } = useAuthStore()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [showCf,   setShowCf]   = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)

  const isLoading  = status === 'loading' && !oauthLoading
  const pwMismatch = confirm.length > 0 && password !== confirm
  const pwMatch    = confirm.length > 0 && password === confirm
  const canSubmit  = name && email && password.length >= 8 && pwMatch

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!canSubmit) return; clearError()
    try { await signUpEmail({ name, email, password }); onSuccess() } catch {}
  }
  const handleOAuth = async (provider: 'google' | 'github') => {
    clearError(); setOauthLoading(provider)
    try { await signInWithOAuth(provider) } catch { setOauthLoading(null) }
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 style={{ color: 'rgba(255,255,255,0.92)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>
          Create your account
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>
          Join thousands of developers learning faster
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {(['google', 'github'] as const).map((p) => (
          <motion.button key={p} type="button" onClick={() => handleOAuth(p)}
            disabled={!!oauthLoading || isLoading} whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}
          >
            {oauthLoading === p
              ? <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              : p === 'google' ? <GoogleIcon /> : <Github className="w-4 h-4" />
            }
            <span className="capitalize">{p}</span>
          </motion.button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>or continue with email</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }} transition={{ duration: 0.2 }}
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name row */}
        <AuthInput id="name" label="Full Name" type="text" value={name} onChange={setName}
          placeholder="Alex Johnson" autoComplete="name" icon={User} />
        <AuthInput id="email" label="Email" type="email" value={email} onChange={setEmail}
          placeholder="you@example.com" autoComplete="email" icon={Mail} />

        <div className="space-y-1">
          <AuthInput id="password" label="Password" type={showPw ? 'text' : 'password'}
            value={password} onChange={setPassword} placeholder="Min. 8 characters"
            autoComplete="new-password" icon={Lock}
            suffix={<button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
              {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>}
          />
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-1">
          <AuthInput id="confirm" label="Confirm Password" type={showCf ? 'text' : 'password'}
            value={confirm} onChange={setConfirm} placeholder="Repeat password"
            autoComplete="new-password" icon={Lock} error={pwMismatch}
            suffix={<button type="button" onClick={() => setShowCf(v => !v)} tabIndex={-1} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
              {showCf ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>}
          />
          <AnimatePresence>
            {pwMismatch && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ color: '#f87171', fontSize: 11 }}>Passwords don't match</motion.p>
            )}
            {pwMatch && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" style={{ color: '#10b981' }} />
                <span style={{ color: '#10b981', fontSize: 11 }}>Passwords match</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button type="submit" disabled={isLoading || !canSubmit}
          whileTap={{ scale: 0.98 }} whileHover={canSubmit ? { scale: 1.01 } : undefined}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold mt-0.5"
          style={{
            background: canSubmit ? 'linear-gradient(135deg, #4f46e5, #06b6d4)' : 'rgba(79,70,229,0.35)',
            color: '#fff',
            boxShadow: canSubmit ? '0 0 24px rgba(79,70,229,0.35)' : 'none',
            cursor: isLoading || !canSubmit ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>
          }
        </motion.button>
      </form>
    </div>
  )
}