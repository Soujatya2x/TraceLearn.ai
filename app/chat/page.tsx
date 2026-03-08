'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Copy, Check, MessageSquare } from 'lucide-react'
import { AppShell } from '@/components/layouts/AppShell'
import { ChatMessage } from '@/features/chat/ChatMessage'
import { TypingIndicator } from '@/features/chat/TypingIndicator'
import { SuggestedPrompts } from '@/features/chat/SuggestedPrompts'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useChatSession, useSendMessage } from '@/hooks/useChat'
import { useAppStore } from '@/store/useAppStore'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/useAnalysis'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { cn } from '@/lib/utils'

function useChatWebSocket(sessionId: string | null) {
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!sessionId) return

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const token =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('tl_access')
        : null

    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'

    const wsBase = apiBase
      .replace('https://', 'wss://')
      .replace('http://', 'ws://')

    const wsUrl = `${wsBase}/ws/session/${sessionId}${token ? `?token=${token}` : ''}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen  = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    ws.onerror = () => setIsConnected(false)

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'CHAT_REPLY') {
          queryClient.invalidateQueries({ queryKey: queryKeys.chat(sessionId) })
        }
      } catch (err) {
        console.error('WebSocket message parse error', err)
      }
    }

    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    }
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

function ConversationCard({
  errorType, errorContext, sessionId, isConnected,
}: {
  errorType: string; errorContext: string; sessionId: string; isConnected: boolean
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-3.5 pt-8 pb-6 px-4">
      <div className="relative">
        {isConnected && (
          <motion.span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background"
            animate={{ boxShadow: ['0 0 0 0 rgba(34,197,94,0.4)', '0 0 0 6px rgba(34,197,94,0)'] }}
            transition={{ duration: 1.5, repeat: Infinity }} />
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="px-4 py-1 rounded-full text-xs font-mono font-bold border"
          style={{ background: 'hsl(var(--destructive) / 0.07)', borderColor: 'hsl(var(--destructive) / 0.22)', color: 'hsl(var(--destructive))', letterSpacing: '0.02em' }}>
          {errorType}
        </span>
        {errorContext && (
          <p className="text-[11px] text-muted-foreground/50 text-center max-w-sm leading-relaxed italic">{errorContext}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isConnected && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            Live
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

// Shown when there's no active session to chat about
function NoSessionState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full gap-4 text-center px-6 py-24"
    >
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <MessageSquare className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">No session to chat about</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Analyze some code in the workspace first, then come back here to ask the AI questions about your error.
        </p>
      </div>
    </motion.div>
  )
}

export default function ChatPage() {
  const { currentSessionId } = useAppStore()
  const chatQuery    = useChatSession(currentSessionId)
  const sendMessage  = useSendMessage(currentSessionId)
  const { isConnected } = useChatWebSocket(currentSessionId)

  const displayData = chatQuery.data

  const [input, setInput]               = useState('')
  const [isTyping, setIsTyping]         = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLTextAreaElement>(null)
  const prevCountRef    = useRef(0)
  const mountedRef      = useRef(false)
  const prevMessageCount = useRef(displayData?.messages.length ?? 0)

  useEffect(() => {
    const newCount = displayData?.messages.length ?? 0
    if (newCount > prevMessageCount.current) {
      setIsTyping(false)
      prevMessageCount.current = newCount
    }
  }, [displayData?.messages.length])

  useEffect(() => {
    const count = displayData?.messages.length ?? 0
    if (!mountedRef.current) { mountedRef.current = true; prevCountRef.current = count; return }
    if (count > prevCountRef.current || isTyping) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    prevCountRef.current = count
  }, [displayData?.messages, isTyping])

  const handleSend = useCallback(async () => {
    const t = input.trim()
    if (!t || !currentSessionId) return
    setInput('')
    setIsTyping(true)
    setShowSuggestions(false)
    try {
      await sendMessage.mutateAsync(t)
    } catch {
      setIsTyping(false)
    }
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

  const canSend = !!currentSessionId && !!displayData && input.trim().length > 0

  return (
    <AppShell activeNav="chat">
      <div className="flex flex-col w-full relative" style={{ height: 'calc(100vh - 56px)' }}>

        {!currentSessionId ? (
          <NoSessionState />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
              <div className="mx-auto max-w-4xl px-5 pb-36">

                {chatQuery.isLoading || !displayData ? (
                  <div className="space-y-4 pt-8"><SkeletonCard /><SkeletonCard /></div>
                ) : (
                  <>
                    <ErrorBoundary label="conversation header">
                      <ConversationCard
                        errorType={displayData.errorType}
                        errorContext={displayData.errorContext}
                        sessionId={currentSessionId}
                        isConnected={isConnected}
                      />
                    </ErrorBoundary>
                    <div className="space-y-5">
                      <ErrorBoundary label="messages">
                        {displayData.messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
                        <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
                        <div ref={messagesEndRef} />
                      </ErrorBoundary>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Floating input */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
              <div className="mx-auto max-w-4xl px-5 pb-5 pointer-events-auto">

                <AnimatePresence>
                  {showSuggestions && !input && (displayData?.suggestedPrompts.length ?? 0) > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="mb-3">
                      <SuggestedPrompts prompts={displayData!.suggestedPrompts} onSelect={handlePromptSelect} />
                    </motion.div>
                  )}
                </AnimatePresence>

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
                    placeholder="Ask anything about your error..."
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
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </div>
          </>
        )}

      </div>
    </AppShell>
  )
}