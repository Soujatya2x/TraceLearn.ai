import apiClient from './client'
import { API_ENDPOINTS } from './endpoints'
import type { ApiResponse, ChatSession, SendMessageRequest } from '@/types'

export async function getChatSession(sessionId: string): Promise<ChatSession> {
  const response = await apiClient.get<ApiResponse<any>>(
    API_ENDPOINTS.CHAT_HISTORY(sessionId),
  )
  const raw = response.data.data

  const cleanString = (val: any) =>
    (!val || val === 'None' || val === 'null') ? '' : String(val)

  return {
    ...raw,
    sessionId:       raw.sessionId ?? sessionId,
    errorType:       cleanString(raw.errorType) || 'Unknown Error',
    errorContext:    cleanString(raw.errorContext),
    suggestedPrompts: raw.suggestedPrompts ?? [],
    createdAt:       raw.createdAt ?? new Date().toISOString(),
    messages: (raw.messages ?? raw.chatHistory ?? []).map((m: any, i: number) => ({
      id:        m.id ?? `msg-${i}`,
      sessionId: raw.sessionId ?? sessionId,
      role:      (m.role ?? 'assistant').toLowerCase(),   // ← normalize USER → user
      content:   cleanString(m.content ?? m.message ?? m.reply),
      timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
    })),
  }
}

export async function sendChatMessage(payload: SendMessageRequest): Promise<void> {
  await apiClient.post(API_ENDPOINTS.CHAT_MESSAGE, payload)
}