'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageSquare } from 'lucide-react'
import { AppShell } from '@/components/layouts/AppShell'
import { ChatMessage } from '@/features/chat/ChatMessage'
import { TypingIndicator } from '@/features/chat/TypingIndicator'
import { SuggestedPrompts } from '@/features/chat/SuggestedPrompts'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useChatSession, useSendMessage } from '@/hooks/useChat'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import type { ChatSession } from '@/types'

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CHAT: ChatSession = {
  sessionId: 'demo-session-001',
  errorType: 'ZeroDivisionError',
  errorContext: 'Division by zero in calculate_average function',
  messages: [
    {
      id: 'msg-001',
      sessionId: 'demo-session-001',
      role: 'assistant',
      content:
        "Hi! I've analyzed your recent **ZeroDivisionError** in `main.py`. The issue occurs on line 8 when `calculate_average([])` is called with an empty list. How can I help you understand it better?",
      timestamp: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: 'msg-002',
      sessionId: 'demo-session-001',
      role: 'user',
      content: 'Why does Python throw this error instead of just returning 0?',
      timestamp: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: 'msg-003',
      sessionId: 'demo-session-001',
      role: 'assistant',
      content:
        'Great question! Python raises `ZeroDivisionError` because mathematically, division by zero is undefined — it\'s not 0, it\'s literally undefined.\n\nReturning 0 would be *silently wrong* and hide bugs. Consider:\n\n```python\n# If it returned 0:\naverage = calculate_average([])  # Returns 0\nif average > threshold:          # Bug: 0 vs threshold\n    send_alert()                 # Silently skipped!\n```\n\nThe explicit error forces you to handle the edge case deliberately.',
      timestamp: new Date(Date.now() - 30000).toISOString(),
    },
  ],
  suggestedPrompts: [
    'Show me the fixed code',
    'What is a guard clause?',
    'How do I prevent this in the future?',
    'Explain the stack trace',
  ],
  createdAt: new Date(Date.now() - 180000).toISOString(),
}

const CHAT_H = 'calc(100vh - 56px - 32px)'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { currentSessionId } = useAppStore()
  const { data: chatSession, isLoading } = useChatSession(currentSessionId)
  const sendMessage = useSendMessage(currentSessionId)

  const [input, setInput]       = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  const hasMountedRef       = useRef(false)
  const prevMessageCountRef = useRef(0)

  const displayData = chatSession ?? MOCK_CHAT

  useEffect(() => {
    const currentCount = displayData.messages.length
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      prevMessageCountRef.current = currentCount
      return
    }
    if (currentCount > prevMessageCountRef.current || isTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = currentCount
  }, [displayData.messages, isTyping])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setInput('')
    setIsTyping(true)
    try {
      await sendMessage.mutateAsync(trimmed)
    } finally {
      setTimeout(() => setIsTyping(false), 1500)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  return (
    <AppShell activeNav="chat">
      {/*
        Same padding as all other pages.
        No fixed height on the outer wrapper — sidebar grows with its
        content, page scrolls naturally. Chat column has a fixed height
        so messages scroll internally, unchanged from before.
      */}
      <div className="px-4 md:px-6 py-4 w-full">
        <div
          className="flex items-stretch relative"
          style={{ minHeight: CHAT_H }}
        >
          {/* ── Fading border overlay: top + sides, gone at bottom ── */}
          <div
            className="absolute inset-0 rounded-xl pointer-events-none z-10"
            style={{
              borderTop:    '1px solid hsl(var(--border))',
              borderLeft:   '1px solid hsl(var(--border))',
              borderRight:  '1px solid hsl(var(--border))',
              borderBottom: 'none',
              maskImage:         'linear-gradient(to bottom, black 0%, black 35%, transparent 72%)',
              WebkitMaskImage:   'linear-gradient(to bottom, black 0%, black 35%, transparent 72%)',
            }}
          />

          {/* ── Chat column — fixed height, messages scroll inside ── */}
          <div
            className="flex-1 flex flex-col min-w-0 overflow-hidden relative rounded-l-xl"
            style={{ height: CHAT_H }}
          >
            {/* Fading divider between chat and sidebar */}
            <div
              className="absolute right-0 top-0 bottom-0 w-px pointer-events-none z-10"
              style={{
                background: 'hsl(var(--border))',
                maskImage:       'linear-gradient(to bottom, black 0%, black 35%, transparent 72%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 35%, transparent 72%)',
              }}
            />

            {/* Session header */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex-shrink-0 px-5 py-2.5 border-b border-border bg-card/60 backdrop-blur-sm flex items-center gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 flex items-center justify-between gap-4">
                <div className="min-w-0 flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground whitespace-nowrap">Chat</p>
                  <span className="text-muted-foreground/40 text-sm font-light select-none">/</span>
                  <p className="text-sm font-mono text-destructive truncate">{displayData.errorType}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-muted/60 rounded-lg">
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">
                    {displayData.messages.length}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {displayData.messages.length !== 1 ? 'msgs' : 'msg'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Messages — only this region scrolls */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 space-y-3 min-h-0">
              {isLoading ? (
                <div className="space-y-4">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : (
                <>
                  {displayData.messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  <AnimatePresence>
                    {isTyping && <TypingIndicator />}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Sticky bottom: suggested prompts + input */}
            <div className="flex-shrink-0 border-t border-border bg-background/80 backdrop-blur-sm">
              <AnimatePresence>
                {!input && displayData.suggestedPrompts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden px-5 pt-3"
                  >
                    <SuggestedPrompts
                      prompts={displayData.suggestedPrompts}
                      onSelect={handlePromptSelect}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="px-5 py-3">
                <motion.div
                  className="flex items-end gap-2.5 bg-card border rounded-2xl px-4 py-2.5"
                  animate={{
                    borderColor: input.trim()
                      ? 'hsl(var(--primary) / 0.45)'
                      : 'hsl(var(--border))',
                  }}
                  transition={{ duration: 0.18 }}
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your error…"
                    rows={1}
                    style={{ resize: 'none' }}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed scrollbar-thin max-h-28 overflow-y-auto py-0.5"
                    aria-label="Message input"
                  />
                  <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
                    <AnimatePresence>
                      {input.length > 0 && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.75 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.75 }}
                          transition={{ duration: 0.13 }}
                          className="text-[10px] text-muted-foreground tabular-nums"
                          aria-live="polite"
                        >
                          {input.length}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <motion.button
                      type="button"
                      onClick={handleSend}
                      disabled={!input.trim() || sendMessage.isPending}
                      whileTap={input.trim() ? { scale: 0.9 } : undefined}
                      whileHover={input.trim() ? { scale: 1.08, y: -1 } : undefined}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                        input.trim()
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-muted text-muted-foreground cursor-not-allowed',
                      )}
                      aria-label="Send message"
                    >
                      <Send className="w-3 h-3" aria-hidden="true" />
                    </motion.button>
                  </div>
                </motion.div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  Shift+Enter for new line · chats are isolated per error session
                </p>
              </div>
            </div>
          </div>

          {/* ── Context sidebar — no fixed height, no scroll, grows naturally ── */}
          <motion.aside
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="w-60 flex-shrink-0 bg-card/30 p-4 hidden lg:flex flex-col gap-4 rounded-r-xl"
            aria-label="Session context"
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex-shrink-0">
              Session Context
            </p>
            <div className="space-y-2">
              <SidebarCard label="Error Type">
                <p className="text-sm font-mono text-destructive">{displayData.errorType}</p>
              </SidebarCard>
              <SidebarCard label="Context">
                <p className="text-xs text-foreground leading-relaxed">{displayData.errorContext}</p>
              </SidebarCard>
              <SidebarCard label="Session ID">
                <p className="text-[11px] font-mono text-muted-foreground truncate">{displayData.sessionId}</p>
              </SidebarCard>
              <SidebarCard label="Messages">
                <p className="text-sm font-semibold text-foreground tabular-nums">{displayData.messages.length}</p>
              </SidebarCard>
            </div>
          </motion.aside>

        </div>
      </div>
    </AppShell>
  )
}

// ─── Sidebar card ─────────────────────────────────────────────────────────────

function SidebarCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3 bg-card border border-border rounded-xl space-y-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{label}</p>
      {children}
    </div>
  )
}