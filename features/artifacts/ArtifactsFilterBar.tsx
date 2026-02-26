'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ArtifactType } from '@/types'

const TYPE_FILTERS: { value: ArtifactType | 'all'; label: string }[] = [
  { value: 'all',     label: 'All'          },
  { value: 'pdf',     label: 'PDF'          },
  { value: 'ppt',     label: 'Presentation' },
  { value: 'summary', label: 'Summary'      },
]

interface ArtifactsFilterBarProps {
  activeFilter: ArtifactType | 'all'
  onFilterChange: (filter: ArtifactType | 'all') => void
  searchQuery: string
  onSearchChange: (q: string) => void
  totalCount: number
}

export function ArtifactsFilterBar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  totalCount,
}: ArtifactsFilterBarProps) {
  const [searchFocused, setSearchFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex items-center gap-3 flex-wrap">

      <div
        className="flex items-center gap-0.5 bg-muted/70 rounded-xl p-1"
        role="tablist"
        aria-label="Filter artifacts by type"
      >
        {TYPE_FILTERS.map((f) => {
          const isActive = activeFilter === f.value
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onFilterChange(f.value)}
              className={cn(
                'relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="filterPill"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          )
        })}
      </div>

      <motion.div
        animate={searchFocused ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'relative flex items-center flex-1 min-w-[180px] max-w-[280px]',
          'rounded-xl border transition-colors duration-200',
          searchFocused
            ? 'border-primary/50 bg-background shadow-sm shadow-primary/5'
            : 'border-border bg-muted/50 hover:border-border/80',
        )}
      >
        <Search
          className={cn(
            'absolute left-2.5 w-3.5 h-3.5 pointer-events-none transition-colors duration-150',
            searchFocused ? 'text-primary' : 'text-muted-foreground',
          )}
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search artifacts…"
          aria-label="Search artifacts"
          className="w-full pl-8 pr-14 py-1.5 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="absolute right-2.5 flex items-center">
          <AnimatePresence mode="wait">
            {searchQuery ? (
              <motion.button
                key="clear"
                type="button"
                onClick={() => { onSearchChange(''); inputRef.current?.focus() }}
                aria-label="Clear search"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </motion.button>
            ) : (
              <motion.span
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: searchFocused ? 0 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[10px] text-muted-foreground/50 font-mono border border-border/60 rounded px-1 py-0.5 leading-none select-none"
                aria-hidden="true"
              >
                /
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.span
          key={totalCount}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="ml-auto text-xs text-muted-foreground tabular-nums"
        >
          {totalCount} artifact{totalCount !== 1 ? 's' : ''}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}