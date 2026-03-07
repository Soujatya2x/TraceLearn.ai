'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getChatSession, sendChatMessage } from '@/services/api/chatService'
import { queryKeys } from './useAnalysis'

export function useChatSession(sessionId: string | null, active = true) {
  return useQuery({
    queryKey: queryKeys.chat(sessionId ?? ''),
    queryFn: () => getChatSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 10,
    refetchInterval: active ? 4000 : false,  // only poll when chat page is open
  })
}

export function useSendMessage(sessionId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: string) =>
      sendChatMessage({ sessionId: sessionId!, message: content }),

    onSuccess: () => {
      // Refetch immediately after send, then polling picks up the reply
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.chat(sessionId ?? '') })
      }, 2000)   // ← wait 2s for AI agent to respond, then fetch
    },
  })
}