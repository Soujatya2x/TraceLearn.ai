'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { tokenStorage, getCurrentUser } from '@/services/api/authService'

// ─── How this page is reached ─────────────────────────────────
//
// OAuth2AuthenticationSuccessHandler (backend) redirects here:
//   {FRONTEND}/auth/callback#token=<accessJWT>
//
// MEDIUM-1 FIX: Access token is now in the URL fragment (#) not query params (?).
//
// Why fragment instead of query param?
//   - Fragments are NEVER sent to the server — they are stripped by the browser
//     before the HTTP request is made. This means the token never appears in:
//       • Backend access logs for this page
//       • The Referer header on any subsequent navigation
//       • CDN or load balancer logs
//       • Analytics tools that scrape URL query strings
//   - Query params (?token=...) appear in all of the above.
//
// The fragment is only readable by JavaScript on the page via window.location.hash.
// useSearchParams() does NOT read fragments — we use window.location.hash directly.
//
// This page then:
//   1. Reads access token from window.location.hash (#token=...)
//   2. Immediately clears the hash from the URL via router.replace() — removes
//      it from browser history so back-navigation can't expose the token
//   3. Stores access token in memory via tokenStorage.setAccess()
//   4. Fetches user profile (GET /auth/me)
//   5. Calls setUser() to populate the auth store
//   6. Navigates to the intended destination
//
// The refresh token is NOT in the URL at all — it arrives as an httpOnly cookie
// set by the backend before the redirect (HIGH-3 fix).

type CallbackState = 'loading' | 'success' | 'error'

// Parses key=value pairs from a URL fragment string.
// e.g. parseFragment("token=eyJ...&next=/dashboard") → { token: "eyJ...", next: "/dashboard" }
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

export default function AuthCallbackPage() {
  const router  = useRouter()
  const setUser = useAuthStore((s) => s.setUser)

  const [state, setState]       = useState<CallbackState>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // Guard: React StrictMode calls effects twice in dev.
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    // Read from fragment — window.location.hash is always available client-side.
    // This page is 'use client' so this runs only in the browser, never on the server.
    const params = parseFragment(window.location.hash)

    const accessToken = params['token'] ?? ''
    const next        = params['next']  ?? '/'

    // Handle OAuth provider errors (e.g. user denied consent).
    // Providers put errors in query params (?error=...) not fragments,
    // so we check window.location.search for those.
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('error')) {
      setState('error')
      setErrorMsg(
        `OAuth error: ${searchParams.get('error_description') ?? searchParams.get('error')}`,
      )
      return
    }

    if (!accessToken) {
      setState('error')
      setErrorMsg('No access token received. Please try signing in again.')
      return
    }

    // Immediately remove the fragment from the URL and browser history.
    // This is the critical step — after router.replace() the token is gone
    // from history even if the user presses Back.
    // We do this BEFORE storing or using the token so the window is as small
    // as possible.
    router.replace(next)

    const expiresAt = Date.now() + 86_400 * 1_000 // 24h default

    // Store access token in memory only — refresh token is in httpOnly cookie
    tokenStorage.setAccess(accessToken, expiresAt)

    getCurrentUser()
      .then((user) => {
        setUser(user)
        setState('success')
        // router.replace(next) was already called above to clear the hash.
        // The navigation to 'next' happens as part of that replace — Next.js
        // handles the routing. We show 'success' briefly then the page changes.
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