'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Copy, Check, Zap } from 'lucide-react'
import { AppShell } from '@/components/layouts/AppShell'
import { ChatMessage } from '@/features/chat/ChatMessage'
import { TypingIndicator } from '@/features/chat/TypingIndicator'
import { SuggestedPrompts } from '@/features/chat/SuggestedPrompts'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { PreviewBadgeInline } from '@/components/ui/PreviewBadge'
import { useChatSession, useSendMessage } from '@/hooks/useChat'
import { useFallback } from '@/hooks/useFallback'
import { useAppStore } from '@/store/useAppStore'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/useAnalysis'
import { cn } from '@/lib/utils'
import type { ChatSession } from '@/types'

const MOCK_CHAT: ChatSession = {
  sessionId: 'demo-session-001',
  errorType: 'ZeroDivisionError',
  errorContext: 'Division by zero in calculate_average — called with empty list on line 8 of main.py',
  messages: [
    { id: 'msg-001', sessionId: 'demo-session-001', role: 'assistant', content: "Hi! I've analyzed your recent **ZeroDivisionError** in `main.py`. The issue occurs on line 8 when `calculate_average([])` is called with an empty list. How can I help?", timestamp: new Date(Date.now() - 120000).toISOString() },
    { id: 'msg-002', sessionId: 'demo-session-001', role: 'user', content: 'Why does Python throw this error instead of just returning 0?', timestamp: new Date(Date.now() - 60000).toISOString() },
    { id: 'msg-003', sessionId: 'demo-session-001', role: 'assistant', content: "Great question! Python raises `ZeroDivisionError` because division by zero is undefined.\n\nReturning 0 silently hides bugs:\n\n```python\naverage = calculate_average([])  # Returns 0\nif average > threshold:          # Bug hidden!\n    send_alert()                 # Silently skipped\n```\n\nThe explicit error forces deliberate handling.", timestamp: new Date(Date.now() - 30000).toISOString() },
  ],
  suggestedPrompts: ['Show me the fixed code', 'What is a guard clause?', 'How do I prevent this?', 'Explain the stack trace'],
  createdAt: new Date(Date.now() - 180000).toISOString(),
}

function useChatWebSocket(sessionId: string | null) {
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  useEffect(() => {
    if (!sessionId) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('tl_auth_token') : null
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080'}/ws/session/${sessionId}${token ? `?token=${token}` : ''}`)
    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    ws.onerror = () => setIsConnected(false)
    ws.onmessage = (e) => { try { const m = JSON.parse(e.data); if (m.type === 'CHAT_REPLY') queryClient.invalidateQueries({ queryKey: queryKeys.chat(sessionId) }) } catch {} }
    return () => ws.close()
  }, [sessionId, queryClient])
  return { isConnected }
}

function SessionPill({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const short = id.length > 18 ? `${id.slice(0, 9)}...${id.slice(-6)}` : id
  const copy = async () => { await navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1800) }
  return (
    <motion.button type="button" onClick={copy} title={id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
      className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/50 transition-all">
      <span className="text-[10px] font-mono text-muted-foreground/60 group-hover:text-foreground transition-colors">{short}</span>
      <AnimatePresence mode="wait" initial={false}>
        {copied
          ? <motion.div key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="w-2.5 h-2.5 text-emerald-500" /></motion.div>
          : <motion.div key="u" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Copy className="w-2.5 h-2.5 text-muted-foreground/35 group-hover:text-muted-foreground" /></motion.div>
        }
      </AnimatePresence>
    </motion.button>
  )
}

function ConversationCard({ errorType, errorContext, sessionId, isPreview, isConnected }: { errorType: string; errorContext: string; sessionId: string; isPreview: boolean; isConnected: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-3.5 pt-8 pb-6 px-4">
      <div className="relative">
        {/* <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), #06b6d4)', boxShadow: '0 0 32px hsl(var(--primary) / 0.4), 0 4px 20px rgba(0,0,0,0.3)' }}>
          <Zap style={{ width: 26, height: 26, color: '#fff' }} />
        </div> */}
        {!isPreview && isConnected && (
          <motion.span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background"
            animate={{ boxShadow: ['0 0 0 0 rgba(34,197,94,0.4)', '0 0 0 6px rgba(34,197,94,0)'] }}
            transition={{ duration: 1.5, repeat: Infinity }} />
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="px-4 py-1 rounded-full text-xs font-mono font-bold border"
            style={{ background: 'hsl(var(--destructive) / 0.07)', borderColor: 'hsl(var(--destructive) / 0.22)', color: 'hsl(var(--destructive))', letterSpacing: '0.02em' }}>
            {errorType}
          </span>
          <PreviewBadgeInline visible={isPreview} />
        </div>
        {errorContext && (
          <p className="text-[11px] text-muted-foreground/50 text-center max-w-sm leading-relaxed italic">{errorContext}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isPreview && (
          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border',
            isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted/60 text-muted-foreground border-border')}>
            <motion.span className={cn('w-1.5 h-1.5 rounded-full', isConnected ? 'bg-emerald-400' : 'bg-muted-foreground/40')}
              animate={isConnected ? { opacity: [1, 0.4, 1] } : {}} transition={{ duration: 2, repeat: Infinity }} />
            {isConnected ? 'Live' : 'Connecting'}
          </div>
        )}
        <SessionPill id={sessionId} />
      </div>

      <div className="flex items-center gap-3 w-full max-w-xs mt-1">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, hsl(var(--border) / 0.55))' }} />
        <span className="text-[9px] text-muted-foreground/30 uppercase tracking-[0.16em] font-medium whitespace-nowrap">start of conversation</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, hsl(var(--border) / 0.55))' }} />
      </div>
    </motion.div>
  )
}

export default function ChatPage() {
  const { currentSessionId } = useAppStore()
  const chatQuery   = useChatSession(currentSessionId)
  const sendMessage = useSendMessage(currentSessionId)
  const { data: displayData, isPreview, isLoading } = useFallback(chatQuery, MOCK_CHAT)
  const { isConnected } = useChatWebSocket(currentSessionId)

  const [input, setInput]                     = useState('')
  const [isTyping, setIsTyping]               = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const prevCountRef   = useRef(0)
  const mountedRef     = useRef(false)

  useEffect(() => {
    const count = displayData.messages.length
    if (!mountedRef.current) { mountedRef.current = true; prevCountRef.current = count; return }
    if (count > prevCountRef.current || isTyping) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    prevCountRef.current = count
  }, [displayData.messages, isTyping])

  const handleSend = useCallback(async () => {
    const t = input.trim()
    if (!t || !currentSessionId) return
    setInput(''); setIsTyping(true); setShowSuggestions(false)
    try { await sendMessage.mutateAsync(t) } finally { setTimeout(() => setIsTyping(false), 2000) }
  }, [input, currentSessionId, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handlePromptSelect = (p: string) => {
    setInput(p); setShowSuggestions(false); inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
    setShowSuggestions(e.target.value.length === 0)
  }

  const canSend = !!currentSessionId && !isPreview && input.trim().length > 0

  return (
    <AppShell activeNav="chat">
      <div className="flex flex-col w-full relative" style={{ height: 'calc(100vh - 56px)' }}>

        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          <div className="mx-auto max-w-4xl px-5 pb-36">
            <ConversationCard
              errorType={displayData.errorType}
              errorContext={displayData.errorContext}
              sessionId={currentSessionId ?? displayData.sessionId}
              isPreview={isPreview}
              isConnected={isConnected}
            />
            <div className="space-y-5">
              {isLoading ? (
                <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
              ) : (
                <>
                  {displayData.messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
                  <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Floating input — absolutely positioned, no hard background below */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <div className="mx-auto max-w-4xl px-5 pb-5 pointer-events-auto">

            {/* Suggestions pop UP, left-aligned */}
            <AnimatePresence>
              {showSuggestions && !input && displayData.suggestedPrompts.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="mb-3">
                  <SuggestedPrompts prompts={displayData.suggestedPrompts} onSelect={handlePromptSelect} />
                </motion.div>
              )}
            </AnimatePresence>

            {/*
              Solid grey input — clean, grounded, terminal-like.
              No blur/glass: solid bg-muted sits on the dark page clearly.
              Border animates to primary color when canSend.
              Typing is ALWAYS enabled; only the send button is gated.
            */}
            <motion.div
              animate={{
                borderColor: canSend ? 'hsl(var(--primary) / 0.55)' : 'hsl(var(--border))',
                boxShadow: canSend
                  ? '0 0 0 3px hsl(var(--primary) / 0.08), 0 2px 16px rgba(0,0,0,0.2)'
                  : '0 2px 10px rgba(0,0,0,0.12)',
              }}
              transition={{ duration: 0.18 }}
              className="flex items-end gap-3 px-4 py-3 rounded-2xl border bg-muted"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isPreview ? 'Type your question...' : 'Ask anything about your error...'}
                rows={1}
                style={{ resize: 'none', height: '24px' }}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed overflow-y-auto py-0"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <AnimatePresence>
                  {input.length > 0 && (
                    <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.12 }}
                      className="text-[10px] text-muted-foreground/40 tabular-nums">
                      {input.length}
                    </motion.span>
                  )}
                </AnimatePresence>
                <motion.button type="button" onClick={handleSend}
                  disabled={!canSend || sendMessage.isPending}
                  whileTap={canSend ? { scale: 0.88 } : undefined}
                  whileHover={canSend ? { scale: 1.08 } : undefined}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                    !canSend && 'bg-muted/70 text-muted-foreground/40 cursor-not-allowed')}
                  style={canSend ? { background: 'linear-gradient(135deg, hsl(var(--primary)), #06b6d4)', boxShadow: '0 0 14px hsl(var(--primary) / 0.4)', color: '#fff' } : {}}>
                  <Send className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </motion.div>

            <p className="text-[10px] text-muted-foreground/35 text-center mt-1.5">
              {isPreview ? 'Analyze a code file to unlock sending' : 'Enter to send · Shift+Enter for new line'}
            </p>
          </div>
        </div>

      </div>
    </AppShell>
  )
}