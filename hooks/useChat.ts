'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getChatSession, sendChatMessage } from '@/services/api/chatService'
import { queryKeys } from './useAnalysis'
import { useAuthStore } from '@/store/useAuthStore'

export function useChatSession(sessionId: string | null, active = true) {
  const { status } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.chat(sessionId ?? ''),
    queryFn: () => getChatSession(sessionId!),
    enabled: !!sessionId && status === 'authenticated',
    staleTime: 1000 * 10,
    refetchInterval: active ? 4000 : false,
  })
}

export function useSendMessage(sessionId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: string) =>
      sendChatMessage({
        sessionId: sessionId!,
        message: content,
      }),

    onSuccess: () => {
      if (!sessionId) return

      // Poll aggressively for AI reply (max 15s)
      let attempts = 0

      const poll = setInterval(() => {
        attempts++

        queryClient.invalidateQueries({
          queryKey: queryKeys.chat(sessionId),
        })

        if (attempts >= 5) {
          clearInterval(poll)
        }
      }, 3000)
    },
  })
}