'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { RecommendedTopic, Priority } from '@/types'

const PRIORITY_CONFIG: Record<Priority, { label: string; style: string; bar: string }> = {
  high: {
    label: 'High Priority',
    style: 'text-destructive bg-destructive/10 border border-destructive/20',
    bar: 'bg-destructive',
  },
  medium: {
    label: 'Medium Priority',
    style: 'text-warning-foreground bg-warning/10 border border-warning/20 text-green-700',
    bar: 'bg-warning',
  },
  low: {
    label: 'Low Priority',
    style: 'text-success-foreground bg-success/10 border border-success/20',
    bar: 'bg-success',
  },
}

const CATEGORY_ICONS: Record<string, string> = {
  Variables: '{}',
  'Control Flow': '⌥',
  Functions: 'ƒ',
  OOP: '◎',
  'Error Handling': '⚠',
  'Data Structures': '⊞',
  Algorithms: '∑',
  Async: '⟲',
}

interface RecommendedTopicCardProps {
  topic: RecommendedTopic
  index: number
}

export function RecommendedTopicCard({ topic, index }: RecommendedTopicCardProps) {
  const [expanded, setExpanded] = useState(false)
  const priority = PRIORITY_CONFIG[topic.priority]
  const categoryIcon = CATEGORY_ICONS[topic.category] ?? '·'

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
      className={cn(
        'bg-card border border-border rounded-xl overflow-hidden',
        'shadow-sm hover:shadow-md transition-shadow duration-200 group',
      )}
      aria-label={`Recommended topic: ${topic.title}`}
    >
      {/* Priority accent bar — grows in from left */}
      <div className="h-0.5 w-full bg-muted overflow-hidden" aria-hidden="true">
        <motion.div
          className={cn('h-full', priority.bar)}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: index * 0.07 + 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Category icon */}
          <motion.div
            whileHover={{ scale: 1.08, rotate: 3 }}
            transition={{ duration: 0.2 }}
            className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-mono text-sm font-bold flex-shrink-0 select-none"
            aria-hidden="true"
          >
            {categoryIcon}
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                  priority.style,
                )}
              >
                {priority.label}
              </span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">
                {topic.category}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground mt-1.5 text-balance">
              {topic.title}
            </h3>
          </div>

          {/* Estimated time */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>{topic.estimatedMinutes}m</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          {topic.description}
        </p>

        {/* Toggle resources */}
        {topic.resourceLinks.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded transition-colors"
              aria-expanded={expanded}
              aria-controls={`topic-resources-${topic.id}`}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Hide resources
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  {topic.resourceLinks.length} resource{topic.resourceLinks.length !== 1 ? 's' : ''}
                </>
              )}
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.ul
                  id={`topic-resources-${topic.id}`}
                  key="resources"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-2 space-y-1 pl-1 overflow-hidden"
                >
                  {topic.resourceLinks.map((link, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.2 }}
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group/link"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0 group-hover/link:text-primary" />
                        <span className="truncate">{link.title}</span>
                        <span className="text-[10px] bg-muted rounded px-1 flex-shrink-0">
                          {link.source}
                        </span>
                      </a>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.article>
  )
}