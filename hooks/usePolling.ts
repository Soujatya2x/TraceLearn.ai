// ============================================================
// TraceLearn.ai — Session Polling Hook
// ============================================================

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSession } from '@/services/api/analysisService'
import { useAppStore } from '@/store/useAppStore'
import type { Session } from '@/types'

const POLL_INTERVAL_MS = 2500
const MAX_POLL_ATTEMPTS = 60 // 2.5s * 60 = 150 seconds max

export function useSessionPolling(sessionId: string | null) {
  const [data, setData] = useState<Session | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptRef = useRef(0)

  const setAnalysisStatus = useAppStore((s) => s.setAnalysisStatus)
  const setCurrentSession = useAppStore((s) => s.setCurrentSession)
  const setIsPolling = useAppStore((s) => s.setIsPolling)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPolling(false)
    attemptRef.current = 0
  }, [setIsPolling])

  const startPolling = useCallback(() => {
    if (!sessionId || intervalRef.current) return

    setIsPolling(true)
    attemptRef.current = 0

    intervalRef.current = setInterval(async () => {
      attemptRef.current += 1

      if (attemptRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling()
        setError(new Error('Polling timeout exceeded'))
        return
      }

      try {
        const session = await getSession(sessionId)
        setData(session)
        setCurrentSession(session)
        setAnalysisStatus(session.status)

        if (session.status === 'completed' || session.status === 'failed') {
          stopPolling()
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        stopPolling()
      }
    }, POLL_INTERVAL_MS)
  }, [sessionId, stopPolling, setAnalysisStatus, setCurrentSession, setIsPolling])

  // Auto start/stop on sessionId change
  useEffect(() => {
    if (sessionId) {
      startPolling()
    } else {
      stopPolling()
    }
    return () => stopPolling()
  }, [sessionId, startPolling, stopPolling])

  return { data, error, stopPolling, startPolling }
}
