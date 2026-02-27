
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getChatSession, sendChatMessage } from '@/services/api/chatService'
import { queryKeys } from './useAnalysis'

// ─── Get Chat Session ─────────────────────────────────────────

export function useChatSession(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.chat(sessionId ?? ''),
    queryFn: () => getChatSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 30,
  })
}

// ─── Send Message ─────────────────────────────────────────────
//
// POST /api/v1/chat/message — returns 202 Accepted (no body).

export function useSendMessage(sessionId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: string) =>
      sendChatMessage({ sessionId: sessionId!, message: content }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat(sessionId ?? '') })
    },
  })
}