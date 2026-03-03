'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Bot, User } from 'lucide-react'
import { chatMessageIn } from '@/animations/variants'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/types'

function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner   = part.slice(3, -3)
      const newline = inner.indexOf('\n')
      const lang    = newline > -1 ? inner.slice(0, newline).trim() : ''
      const code    = newline > -1 ? inner.slice(newline + 1) : inner
      return (
        <div key={i} className="relative mt-2 mb-2">
          {lang && (
            <div className="flex items-center px-3 pt-2 pb-1 bg-muted/20 border-b border-border/40 rounded-t-lg">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">{lang}</span>
            </div>
          )}
          <pre className={cn(
            'bg-[#1a1a1a] text-zinc-200 p-3 text-xs font-mono overflow-x-auto scrollbar-thin leading-relaxed',
            lang ? 'rounded-b-lg' : 'rounded-lg',
          )}>
            <code>{code}</code>
          </pre>
        </div>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-muted text-primary px-1.5 py-0.5 rounded text-[0.8em] font-mono">{part.slice(1, -1)}</code>
    }
    return (
      <span key={i}>
        {part.split(/(\*\*[^*]+\*\*)/g).map((b, j) =>
          b.startsWith('**') && b.endsWith('**')
            ? <strong key={j} className="font-semibold text-foreground">{b.slice(2, -2)}</strong>
            : <span key={j}>{b}</span>
        )}
      </span>
    )
  })
}

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const [copied, setCopied] = useState(false)
  const [time, setTime]     = useState<string | null>(null)
  const isUser = message.role === 'user'

  useEffect(() => {
    setTime(new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
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
      <div
        className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5')}
        style={isUser
          ? { background: 'hsl(var(--primary) / 0.18)', color: 'hsl(var(--primary))' }
          : { background: 'linear-gradient(135deg, hsl(var(--primary)), #06b6d4)' }
        }
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-white" />}
      </div>

      <div className={cn('flex flex-col gap-1 max-w-[82%]', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-card border border-border text-foreground rounded-tl-sm',
        )}>
          {renderContent(message.content)}
        </div>

        <div className={cn(
          'flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          isUser ? 'flex-row-reverse' : 'flex-row',
        )}>
          {time && <span className="text-[10px] text-muted-foreground/60">{time}</span>}
          <motion.button type="button" onClick={handleCopy} aria-label="Copy message"
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied
                ? <motion.div key="ck" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="w-3 h-3 text-emerald-500" /></motion.div>
                : <motion.div key="cp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Copy className="w-3 h-3" /></motion.div>
              }
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}