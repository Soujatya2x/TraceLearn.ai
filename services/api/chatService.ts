// ============================================================
// TraceLearn.ai — Chat Service
// ============================================================

import apiClient from './client'
import { API_ENDPOINTS } from './endpoints'
import type { ApiResponse, ChatMessage, ChatSession, SendMessageRequest } from '@/types'

// ─── Get Chat History ────────────────────────────────────────

export async function getChatSession(sessionId: string): Promise<ChatSession> {
  const response = await apiClient.get<ApiResponse<ChatSession>>(
    API_ENDPOINTS.CHAT_HISTORY(sessionId),
  )
  return response.data.data
}

// ─── Send Message ────────────────────────────────────────────

export async function sendChatMessage(
  payload: SendMessageRequest,
): Promise<ChatMessage> {
  const response = await apiClient.post<ApiResponse<ChatMessage>>(
    API_ENDPOINTS.CHAT_MESSAGE,
    payload,
  )
  return response.data.data
}
