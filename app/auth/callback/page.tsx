'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { tokenStorage, getCurrentUser } from '@/services/api/authService'

type CallbackState = 'loading' | 'success' | 'error'

function parseFragment(hash: string): Record<string, string> {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return {}
  return Object.fromEntries(
    raw.split('&').map((pair) => {
      const [k, ...rest] = pair.split('=')
      return [k, decodeURIComponent(rest.join('='))]
    }),
  )
}

// Also parse query params (?token=...) as fallback
function parseQuery(search: string): Record<string, string> {
  const params = new URLSearchParams(search)
  const result: Record<string, string> = {}
  params.forEach((v, k) => { result[k] = v })
  return result
}

export default function AuthCallbackPage() {
  const router  = useRouter()
  const setUser = useAuthStore((s) => s.setUser)

  const [state, setState]       = useState<CallbackState>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    // Check for OAuth provider errors first
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('error')) {
      setState('error')
      setErrorMsg(
        `OAuth error: ${searchParams.get('error_description') ?? searchParams.get('error')}`,
      )
      return
    }

    // Try fragment first (#token=...), then query param (?token=...) as fallback
    const fragmentParams = parseFragment(window.location.hash)
    const queryParams    = parseQuery(window.location.search)

    const accessToken = fragmentParams['token'] ?? queryParams['token'] ?? ''
    const next        = fragmentParams['next']  ?? queryParams['next']  ?? '/'

    if (!accessToken) {
      setState('error')
      setErrorMsg('No access token received. Please try signing in again.')
      return
    }

    const expiresAt = Date.now() + 86_400 * 1_000 // 24h

    // ── CRITICAL ORDER ──────────────────────────────────────
    // 1. Store token in memory + sessionStorage FIRST
    // 2. Fetch user (needs the token)
    // 3. Store user in Zustand
    // 4. THEN navigate away
    // If we navigate first, the new page's initAuth() runs before
    // the token is stored and falls through to a failed refresh call.
    // ────────────────────────────────────────────────────────

    tokenStorage.setAccess(accessToken, expiresAt)

    getCurrentUser()
      .then((user) => {
        setUser(user)
        setState('success')
        // Clear the fragment/token from URL then navigate
        // Small delay so user sees the success tick
        setTimeout(() => {
          router.replace(next)
        }, 500)
      })
      .catch((err: unknown) => {
        tokenStorage.clear()
        const msg =
          err instanceof Error ? err.message : 'Could not load user profile. Please try again.'
        setState('error')
        setErrorMsg(msg)
      })
  }, [router, setUser])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-5 text-center max-w-sm"
      >
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
          <img
            src="/apple-icon.png"
            alt="TraceLearn.ai"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>

        <motion.div
          key={state}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          {state === 'loading' && <Loader2      className="w-10 h-10 text-primary animate-spin" />}
          {state === 'success' && <CheckCircle2 className="w-10 h-10 text-emerald-500"          />}
          {state === 'error'   && <XCircle      className="w-10 h-10 text-destructive"           />}
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