// ============================================================
// TraceLearn.ai — Immutable API Endpoint Definitions
// Base Path: /api/v1/ (DO NOT CHANGE)
// ============================================================

export const API_ENDPOINTS = {
  // ── Analysis ─────────────────────────────────────────────
  ANALYZE: '/analyze',

  // ── Session ──────────────────────────────────────────────
  SESSION: (sessionId: string) => `/session/${sessionId}`,

  // ── Retry ────────────────────────────────────────────────
  RETRY: (sessionId: string) => `/session/${sessionId}/retry`,

  // ── Chat ─────────────────────────────────────────────────
  CHAT_HISTORY: (sessionId: string) => `/chat/${sessionId}`,
  CHAT_MESSAGE: '/chat/message',

  // ── Artifacts ────────────────────────────────────────────
  ARTIFACTS: (sessionId: string) => `/artifacts/${sessionId}`,

  // ── Roadmap ──────────────────────────────────────────────
  ROADMAP: (userId: string) => `/roadmap/${userId}`,
} as const
