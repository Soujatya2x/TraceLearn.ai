'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, WrapText, AlignLeft,
  FileCode2, Circle,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'


const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <EditorSkeleton />,
})


const LANG_META: Record<string, { label: string; color: string; dot: string }> = {
  python:     { label: 'Python',     color: 'text-blue-400',   dot: 'bg-blue-400'   },
  javascript: { label: 'JavaScript', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  typescript: { label: 'TypeScript', color: 'text-blue-300',   dot: 'bg-blue-300'   },
  java:       { label: 'Java',       color: 'text-orange-400', dot: 'bg-orange-400' },
  go:         { label: 'Go',         color: 'text-cyan-400',   dot: 'bg-cyan-400'   },
  plaintext:  { label: 'Plain Text', color: 'text-zinc-400',   dot: 'bg-zinc-400'   },
}


function EditorSkeleton() {
  const lines = [72, 100, 55, 88, 40, 95, 60, 100, 45, 78, 35, 90, 65, 80, 50]
  return (
    <div
      className="w-full h-full bg-[#1e1e1e] flex flex-col gap-2.5 p-5 pt-4"
      aria-hidden="true"
    >
      {/* Fake gutter + code lines */}
      {lines.map((w, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-2.5 w-4 rounded skeleton-shimmer opacity-10 flex-shrink-0" />
          <div
            className="h-2.5 rounded skeleton-shimmer opacity-[0.18]"
            style={{ width: `${w}%` }}
          />
        </div>
      ))}
    </div>
  )
}


interface ToolbarProps {
  language: string
  lineCount: number
  cursorLine: number
  cursorCol: number
  charCount: number
  wordWrap: boolean
  onToggleWrap: () => void
  onCopy: () => void
  copied: boolean
}

function EditorToolbar({
  language, lineCount, cursorLine, cursorCol,
  charCount, wordWrap, onToggleWrap, onCopy, copied,
}: ToolbarProps) {
  const meta = LANG_META[language] ?? LANG_META.plaintext

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#161616] border-b border-white/[0.06] flex-shrink-0 select-none">
      {/* Left — language badge */}
      <div className="flex items-center gap-2">
        <motion.div
          className="flex items-center gap-1.5"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', meta.dot)} />
          <span className={cn('text-[11px] font-semibold tracking-wide', meta.color)}>
            {meta.label}
          </span>
        </motion.div>

        <span className="text-[10px] text-zinc-600 hidden sm:block">
          {lineCount} lines
        </span>
        <span className="text-[10px] text-zinc-700 hidden sm:block">·</span>
        <span className="text-[10px] text-zinc-600 hidden sm:block">
          {charCount.toLocaleString()} chars
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <span className="text-[10px] text-zinc-600 mr-2 font-mono hidden md:block">
          Ln {cursorLine}, Col {cursorCol}
        </span>

        <motion.button
          type="button"
          onClick={onToggleWrap}
          aria-label={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
            wordWrap
              ? 'text-primary bg-primary/20'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5',
          )}
        >
          {wordWrap
            ? <WrapText className="w-3.5 h-3.5" />
            : <AlignLeft className="w-3.5 h-3.5" />
          }
        </motion.button>

        <motion.button
          type="button"
          onClick={onCopy}
          aria-label="Copy code"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
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
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <Copy className="w-3.5 h-3.5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  )
}


interface CodeEditorProps {
  errorLine?: number
}

export function CodeEditor({ errorLine }: CodeEditorProps) {
  const code     = useAppStore((s) => s.code)
  const language = useAppStore((s) => s.language)
  const setCode  = useAppStore((s) => s.setCode)
  const theme    = useAppStore((s) => s.theme)

  const containerRef     = useRef<HTMLDivElement>(null)
  const editorRef        = useRef<Parameters<NonNullable<React.ComponentProps<typeof MonacoEditor>['onMount']>>[0] | null>(null)
  const decorationsRef   = useRef<string[]>([])

  const [editorHeight, setEditorHeight]   = useState<number>(500)
  const [editorMounted, setEditorMounted] = useState(false)
  const [wordWrap, setWordWrap]           = useState(true)
  const [copied, setCopied]               = useState(false)
  const [cursorLine, setCursorLine]       = useState(1)
  const [cursorCol, setCursorCol]         = useState(1)

  const lineCount = code.split('\n').length
  const charCount = code.length

  const monacoLanguage =
    language === 'python'     ? 'python'
    : language === 'javascript' ? 'javascript'
    : language === 'typescript' ? 'typescript'
    : language === 'java'       ? 'java'
    : 'plaintext'

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        if (h > 0) setEditorHeight(h)
      }
    })
    ro.observe(el)
    const rect = el.getBoundingClientRect()
    if (rect.height > 0) setEditorHeight(rect.height)
    return () => ro.disconnect()
  }, [])

  // Sync word wrap with editor
  useEffect(() => {
    editorRef.current?.updateOptions({ wordWrap: wordWrap ? 'on' : 'off' })
  }, [wordWrap])

  // Update error line decoration when errorLine changes
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !errorLine) return
    // @ts-ignore — monaco is available at runtime
    const monaco = (window as any).monaco
    if (!monaco) return
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(errorLine, 1, errorLine, 1),
        options: {
          isWholeLine: true,
          className: 'monaco-error-line',
          glyphMarginClassName: 'monaco-error-glyph',
        },
      },
    ])
    editor.revealLineInCenter(errorLine)
  }, [errorLine])

  const handleMount = useCallback(
    (
      editor: Parameters<NonNullable<React.ComponentProps<typeof MonacoEditor>['onMount']>>[0],
      monaco: Parameters<NonNullable<React.ComponentProps<typeof MonacoEditor>['onMount']>>[1],
    ) => {
      editorRef.current = editor
      setEditorMounted(true)
      editor.focus()

      // Track cursor position for toolbar
      editor.onDidChangeCursorPosition((e: any) => {
        setCursorLine(e.position.lineNumber)
        setCursorCol(e.position.column)
      })

      // Error line decoration
      if (errorLine) {
        decorationsRef.current = editor.deltaDecorations([], [
          {
            range: new monaco.Range(errorLine, 1, errorLine, 1),
            options: {
              isWholeLine: true,
              className: 'monaco-error-line',
              glyphMarginClassName: 'monaco-error-glyph',
            },
          },
        ])
        editor.revealLineInCenter(errorLine)
      }
    },
    [errorLine],
  )

  const handleCopy = useCallback(async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback — select all and copy via execCommand
      editorRef.current?.focus()
      editorRef.current?.trigger('keyboard', 'editor.action.selectAll', null)
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col border-l-2 border-l-primary/20"
    >
      <EditorToolbar
        language={monacoLanguage}
        lineCount={lineCount}
        cursorLine={cursorLine}
        cursorCol={cursorCol}
        charCount={charCount}
        wordWrap={wordWrap}
        onToggleWrap={() => setWordWrap((w) => !w)}
        onCopy={handleCopy}
        copied={copied}
      />

      {/* Editor area */}
      <div className="relative flex-1 min-h-0">
        <AnimatePresence>
          {!editorMounted && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <EditorSkeleton />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: editorMounted ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ height: editorHeight }}
        >
          <MonacoEditor
            height={editorHeight}
            language={monacoLanguage}
            value={code}
            onChange={(val) => setCode(val ?? '')}
            theme={monacoTheme}
            options={{
              fontSize: 13,
              fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
              fontLigatures: true,
              lineNumbers: 'on',
              lineNumbersMinChars: 3,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: wordWrap ? 'on' : 'off',
              renderLineHighlight: 'all',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              padding: { top: 12, bottom: 16 },
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 4,
              automaticLayout: true,
              tabSize: 4,
              insertSpaces: true,
              scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
                useShadows: false,
              },
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              renderWhitespace: 'none',
              guides: { indentation: true },
              bracketPairColorization: { enabled: true },
              suggest: { showIcons: true },
            }}
            onMount={handleMount}
          />
        </motion.div>

        <AnimatePresence>
          {errorLine && editorMounted && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-0 bottom-0 w-0.5 bg-destructive/60"
              style={{ originY: 0 }}
            />
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: editorMounted ? 1 : 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="flex items-center gap-3 px-3 py-1 bg-[#161616] border-t border-white/[0.06] flex-shrink-0"
      >
        {errorLine ? (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5"
          >
            <Circle className="w-2 h-2 fill-destructive text-destructive" />
            <span className="text-[10px] text-destructive/80 font-mono">
              Error on line {errorLine}
            </span>
          </motion.div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
            <span className="text-[10px] text-zinc-600 font-mono">No errors detected</span>
          </div>
        )}
        <span className="ml-auto text-[10px] text-zinc-700 font-mono">
          UTF-8 · LF
        </span>
        <div className="flex items-center gap-1">
          <FileCode2 className="w-3 h-3 text-zinc-700" />
          <span className="text-[10px] text-zinc-600">
            {monacoLanguage}
          </span>
        </div>
      </motion.div>
    </div>
  )
}