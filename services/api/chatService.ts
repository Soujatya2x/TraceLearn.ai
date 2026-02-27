
import apiClient from './client'
import { API_ENDPOINTS } from './endpoints'
import type { ApiResponse, ChatSession, SendMessageRequest } from '@/types'

// ─── Get Chat Session ─────────────────────────────────────────
//
// GET /api/v1/chat/{sessionId}
// Returns ChatSessionResponse from backend — already matches ChatSession type:
//   sessionId, errorType, errorContext, messages[], suggestedPrompts[], createdAt

export async function getChatSession(sessionId: string): Promise<ChatSession> {
  const response = await apiClient.get<ApiResponse<ChatSession>>(
    API_ENDPOINTS.CHAT_HISTORY(sessionId),
  )
  return response.data.data
}

// ─── Send Message ─────────────────────────────────────────────
//
// POST /api/v1/chat/message
// Returns 202 Accepted with no body — AI reply comes via WebSocket.
// Backend expects: { sessionId: UUID, message: string }
// NOTE: field is "message" not "content" — matches ChatMessageRequest.java

export async function sendChatMessage(payload: SendMessageRequest): Promise<void> {
  await apiClient.post(
    API_ENDPOINTS.CHAT_MESSAGE,
    payload,
  )
}