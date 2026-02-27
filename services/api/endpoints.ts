
export const API_ENDPOINTS = {
  // ── Analysis ─────────────────────────────────────────────
  ANALYZE: '/analyze',

  // ── Session ──────────────────────────────────────────────
  SESSION: (sessionId: string) => `/session/${sessionId}`,
  SESSION_STATUS: (sessionId: string) => `/session/${sessionId}/status`,
  SESSION_ANALYSIS: (sessionId: string) => `/session/${sessionId}/analysis`,
  SESSION_ATTEMPTS: (sessionId: string) => `/session/${sessionId}/attempts`,

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