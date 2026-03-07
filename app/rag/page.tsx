'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, CheckCircle2, Send, Loader2,
  BookOpen, X, ChevronDown, ChevronUp, AlertCircle,
  Files, Sparkles, Database
} from 'lucide-react'
import { AppShell } from '@/components/layouts/AppShell'
import { PreviewBadgeInline } from '@/components/ui/PreviewBadge'
import { useRagUpload, useRagQuery } from '@/hooks/useRag'
import { cn } from '@/lib/utils'
import type { SourceReference } from '@/services/api/ragService'

// ─── Phase type ───────────────────────────────────────────────────────────────

type Phase = 'upload' | 'indexing' | 'ready' | 'asking' | 'answered'

// ─── File pill component ──────────────────────────────────────────────────────

function FilePill({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-[var(--card)] border border-[var(--border)] rounded-full px-3 py-1 text-sm text-[var(--foreground)]">
      <FileText className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
      <span className="max-w-[180px] truncate">{name}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
        aria-label={`Remove ${name}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Source reference card ────────────────────────────────────────────────────

function SourceCard({ source, index }: { source: SourceReference; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const confidence = Math.round(source.score * 100)

  return (
    <div className="border border-[var(--border)] rounded-xl bg-[var(--card)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)]/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-[var(--primary)]">{index + 1}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">{source.fileName}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{confidence}% relevance</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="bg-[var(--muted)]/40 rounded-lg p-3 text-sm text-[var(--muted-foreground)] leading-relaxed font-mono border border-[var(--border)]">
                {source.excerpt}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Phase indicator strip ────────────────────────────────────────────────────

function PhaseIndicator({ phase }: { phase: Phase }) {
  const steps = [
    { key: 'upload',   label: 'Upload',  icon: Upload },
    { key: 'indexing', label: 'Index',   icon: Database },
    { key: 'ready',    label: 'Ready',   icon: CheckCircle2 },
    { key: 'answered', label: 'Answer',  icon: Sparkles },
  ]

  const order: Record<Phase, number> = {
    upload: 0, indexing: 1, ready: 2, asking: 2, answered: 3,
  }

  const current = order[phase]

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        const Icon = step.icon
        return (
          <div key={step.key} className="flex items-center">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              done  && 'bg-[var(--primary)]/10 text-[var(--primary)]',
              active && 'bg-[var(--primary)] text-white shadow-sm',
              !done && !active && 'text-[var(--muted-foreground)]',
            )}>
              <Icon className="w-3.5 h-3.5" />
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'w-8 h-px mx-1',
                i < current ? 'bg-[var(--primary)]' : 'bg-[var(--border)]',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RagPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryInputRef = useRef<HTMLTextAreaElement>(null)

  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [phase, setPhase] = useState<Phase>('upload')
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; sources?: SourceReference[] }>
  >([])

  const upload = useRagUpload()
  const ask    = useRagQuery()

  // ── Drag and drop ────────────────────────────────────────────────────────
  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true)  }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...dropped.filter(f => !names.has(f.name))].slice(0, 10)
    })
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const picked = Array.from(e.target.files)
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...picked.filter(f => !names.has(f.name))].slice(0, 10)
    })
    e.target.value = ''
  }

  const removeFile = (name: string) =>
    setFiles(prev => prev.filter(f => f.name !== name))

  // ── Phase 1: Upload + Index ───────────────────────────────────────────────
  const handleUpload = () => {
    if (!files.length) return
    setPhase('indexing')

    upload.mutate(files, {
      onSuccess: (data) => {
        setCollectionId(data.collectionId)
        setPhase('ready')
      },
      onError: () => {
        setPhase('upload')
      },
    })
  }

  // ── Phase 2: Ask query ────────────────────────────────────────────────────
  const handleAsk = () => {
    if (!query.trim() || !collectionId) return
    const userMessage = query.trim()
    setQuery('')
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }])
    setPhase('asking')

    ask.mutate({ collectionId, query: userMessage }, {
      onSuccess: (data) => {
        setChatHistory(prev => [
          ...prev,
          { role: 'assistant', content: data.answer, sources: data.sources },
        ])
        setPhase('answered')
      },
      onError: (err) => {
        setChatHistory(prev => [
          ...prev,
          { role: 'assistant', content: `Error: ${err.message}`, sources: [] },
        ])
        setPhase('ready')
      },
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  const canUpload = files.length > 0 && phase === 'upload'
  const canAsk    = !!collectionId && query.trim().length > 0 && phase !== 'asking' && phase !== 'indexing'
  const isIndexing = phase === 'indexing'
  const isReady    = phase === 'ready' || phase === 'answered'

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--foreground)]">Document Q&A</h1>
                <PreviewBadgeInline label="RAG" />
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Upload documents, then ask questions about them using AI
              </p>
            </div>
          </div>
        </div>

        {/* Phase indicator */}
        <PhaseIndicator phase={phase} />

        {/* ── Section 1: Upload ────────────────────────────────────────────── */}
        <div className={cn(
          'mb-6 rounded-2xl border bg-[var(--card)] transition-all',
          isReady ? 'border-[var(--primary)]/30 opacity-70' : 'border-[var(--border)]',
        )}>
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Files className="w-4 h-4 text-[var(--primary)]" />
              <span className="font-semibold text-sm text-[var(--foreground)]">
                Step 1 — Upload Documents
              </span>
            </div>
            {isReady && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Indexed
              </div>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isReady && !isIndexing && fileInputRef.current?.click()}
              className={cn(
                'relative rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all',
                isDragging    && 'border-[var(--primary)] bg-[var(--primary)]/5',
                !isDragging && !isReady   && 'border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]/30 cursor-pointer',
                isReady && 'border-[var(--border)] bg-[var(--muted)]/20 cursor-default',
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md,.docx,.py,.java,.js,.html,.csv"
                onChange={handleFileInput}
                className="hidden"
                disabled={isReady || isIndexing}
              />
              <Upload className={cn(
                'w-8 h-8 mx-auto mb-2',
                isDragging ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]',
              )} />
              <p className="text-sm font-medium text-[var(--foreground)]">
                {isReady ? 'Documents uploaded' : 'Drop files here or click to browse'}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                PDF, TXT, MD, DOCX, PY, JAVA, JS, HTML, CSV — up to 10 files, 20 MB each
              </p>
            </div>

            {/* File pills */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map(f => (
                  <FilePill
                    key={f.name}
                    name={f.name}
                    onRemove={() => !isReady && !isIndexing && removeFile(f.name)}
                  />
                ))}
              </div>
            )}

            {/* Upload error */}
            {upload.isError && (
              <div className="flex items-center gap-2 text-sm text-[var(--destructive)] bg-[var(--destructive)]/5 border border-[var(--destructive)]/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {upload.error?.message ?? 'Upload failed. Please try again.'}
              </div>
            )}

            {/* Upload / indexing button */}
            {!isReady && (
              <button
                onClick={handleUpload}
                disabled={!canUpload || isIndexing}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
                  canUpload && !isIndexing
                    ? 'bg-[var(--primary)] text-white hover:opacity-90 shadow-sm'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed',
                )}
              >
                {isIndexing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Indexing documents…
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Process & Index Documents
                  </>
                )}
              </button>
            )}

            {/* Success message */}
            {isReady && upload.data && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 text-sm bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2"
              >
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {upload.data.message}
                  </span>
                  <span className="text-green-600/70 dark:text-green-500/70 ml-1 text-xs">
                    ({upload.data.chunkCount} chunks)
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Section 2: Query ─────────────────────────────────────────────── */}
        <div className={cn(
          'rounded-2xl border bg-[var(--card)] transition-all',
          !isReady && 'opacity-50 pointer-events-none',
          isReady && 'border-[var(--border)]',
        )}>
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--primary)]" />
            <span className="font-semibold text-sm text-[var(--foreground)]">
              Step 2 — Ask Questions
            </span>
            {!isReady && (
              <span className="text-xs text-[var(--muted-foreground)] ml-auto">
                Complete Step 1 first
              </span>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Chat history */}
            <AnimatePresence initial={false}>
              {chatHistory.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-[var(--primary)] text-white rounded-br-sm'
                      : 'bg-[var(--muted)]/50 text-[var(--foreground)] border border-[var(--border)] rounded-bl-sm',
                  )}>
                    {msg.content}

                    {/* Source references */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                          Sources
                        </p>
                        {msg.sources.map((src, si) => (
                          <SourceCard key={si} source={src} index={si} />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator while RAG is answering */}
            {phase === 'asking' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map(n => (
                    <motion.div
                      key={n}
                      className="w-2 h-2 rounded-full bg-[var(--muted-foreground)]"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: n * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Input area */}
            <div className="flex gap-2 items-end">
              <textarea
                ref={queryInputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isReady
                    ? 'Ask anything about your documents… (Enter to send)'
                    : 'Upload and index documents first'
                }
                rows={2}
                disabled={!isReady || phase === 'asking'}
                className={cn(
                  'flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-all',
                  'focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20',
                  (!isReady || phase === 'asking') && 'cursor-not-allowed opacity-50',
                )}
              />
              <button
                onClick={handleAsk}
                disabled={!canAsk}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl transition-all shrink-0',
                  canAsk
                    ? 'bg-[var(--primary)] text-white hover:opacity-90 shadow-sm'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed',
                )}
                aria-label="Send query"
              >
                {phase === 'asking'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>

            {ask.isError && (
              <div className="flex items-center gap-2 text-sm text-[var(--destructive)] bg-[var(--destructive)]/5 border border-[var(--destructive)]/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {ask.error?.message ?? 'Query failed. Please try again.'}
              </div>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  )
}