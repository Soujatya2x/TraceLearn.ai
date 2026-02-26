'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Zap, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { handleOAuthCallback } from '@/services/api/authService'
import { useAuthStore } from '@/store/useAuthStore'

type CallbackState = 'loading' | 'success' | 'error'

export default function AuthCallbackPage() {
  const router       = useRouter()
  const params       = useSearchParams()
  const setUser      = useAuthStore((s) => s.setUser)
  const [state, setState] = useState<CallbackState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const code     = params.get('code')    ?? ''
    const oauthState = params.get('state') ?? ''
    const provider = (params.get('provider') ?? 'google') as 'google' | 'github'
    const next     = params.get('next')    ?? '/'

    if (!code) {
      setState('error')
      setErrorMsg('No authorization code received from provider.')
      return
    }

    handleOAuthCallback({ code, state: oauthState, provider })
      .then(({ user }) => {
        setUser(user)
        setState('success')
        setTimeout(() => router.replace(next), 1000)
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : 'Authentication failed. Please try again.'
        setState('error')
        setErrorMsg(msg)
      })
  }, [params, router, setUser])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-5 text-center max-w-sm"
      >
        {/* Logo */}
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>

        {/* State icon */}
        <motion.div
          key={state}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          {state === 'loading' && <Loader2 className="w-10 h-10 text-primary animate-spin" />}
          {state === 'success' && <CheckCircle2 className="w-10 h-10 text-emerald-500" />}
          {state === 'error'   && <XCircle      className="w-10 h-10 text-destructive" />}
        </motion.div>

        <div>
          <p className="text-base font-semibold text-foreground">
            {state === 'loading' && 'Finishing sign-in…'}
            {state === 'success' && 'Signed in! Redirecting…'}
            {state === 'error'   && 'Sign-in failed'}
          </p>
          {state === 'error' && (
            <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
          )}
        </div>

        {state === 'error' && (
          <button
            type="button"
            onClick={() => router.replace('/auth/sign-in')}
            className="text-sm text-primary hover:underline"
          >
            Back to sign in
          </button>
        )}
      </motion.div>
    </div>
  )
}