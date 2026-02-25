'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Bot, User } from 'lucide-react'
import { chatMessageIn } from '@/animations/variants'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/types'

interface ChatMessageProps {
  message: ChatMessageType
}

// ─── Content renderer ─────────────────────────────────────────
// Handles ```fenced blocks```, `inline code`, and **bold** text.

function renderContent(content: string) {
  // Split on fenced blocks first, then inline code
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g)

  return parts.map((part, i) => {
    // Fenced code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner   = part.slice(3, -3)
      const newline = inner.indexOf('\n')
      const lang    = newline > -1 ? inner.slice(0, newline).trim() : ''
      const code    = newline > -1 ? inner.slice(newline + 1) : inner

      return (
        <div key={i} className="relative mt-2 mb-2 group/code">
          {lang && (
            <div className="flex items-center justify-between px-3 pt-2 pb-1 bg-muted/20 border-b border-border/40 rounded-t-lg">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">{lang}</span>
            </div>
          )}
          <pre className={cn(
            'bg-[#1e1e1e] text-zinc-200 p-3 text-xs font-mono overflow-x-auto scrollbar-thin leading-relaxed',
            lang ? 'rounded-b-lg' : 'rounded-lg',
          )}>
            <code>{code}</code>
          </pre>
        </div>
      )
    }

    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="bg-muted text-primary px-1.5 py-0.5 rounded text-[0.8em] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    // Bold (**text**)
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
    return (
      <span key={i}>
        {boldParts.map((b, j) =>
          b.startsWith('**') && b.endsWith('**')
            ? <strong key={j} className="font-semibold text-foreground">{b.slice(2, -2)}</strong>
            : <span key={j}>{b}</span>
        )}
      </span>
    )
  })
}

// ─── Component ────────────────────────────────────────────────

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const [time, setTime]     = useState<string | null>(null)
  const isUser = message.role === 'user'

  // Defer locale-dependent time formatting to the client only.
  // Avoids SSR/client hydration mismatch from differing locale outputs.
  useEffect(() => {
    setTime(
      new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    )
  }, [message.timestamp])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      variants={chatMessageIn}
      initial="initial"
      animate="animate"
      className={cn('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* ── Avatar ───────────────────────────────────────── */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          isUser ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* ── Bubble + meta ────────────────────────────────── */}
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-card border border-border text-foreground rounded-tl-sm',
          )}
        >
          {renderContent(message.content)}
        </div>

        {/* Timestamp + copy — reveal on group hover */}
        <motion.div
          className={cn(
            'flex items-center gap-2 transition-opacity',
            isUser ? 'flex-row-reverse' : 'flex-row',
          )}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0 }}  // keeps it hidden by default
          // actual show/hide handled by group-hover CSS
        >
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {time && (
              <span className="text-[10px] text-muted-foreground">{time}</span>
            )}
            <motion.button
              type="button"
              onClick={handleCopy}
              aria-label="Copy message"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Copy className="w-3 h-3" aria-hidden="true" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}