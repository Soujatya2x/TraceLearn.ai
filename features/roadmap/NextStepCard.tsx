'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ExternalLink, Code2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { NextStep } from '@/types'

interface NextStepCardProps {
  step: NextStep
  index: number
}

export function NextStepCard({ step, index }: NextStepCardProps) {
  const [showExercises, setShowExercises] = useState(false)
  const enterDelay = index * 0.08

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: enterDelay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
      aria-label={`Next step: ${step.action}`}
    >
      <div className="flex items-start gap-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay: enterDelay + 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 mt-0.5"
          aria-hidden="true"
        >
          {index + 1}
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">
              {step.action}
            </h3>
          </div>

          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {step.description}
          </p>

          {step.resourceLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {step.resourceLinks.map((link, i) => (
                <motion.a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  aria-label={`Open resource: ${link.title}`}
                >
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  {link.title}
                </motion.a>
              ))}
            </div>
          )}

          {step.practiceExercises.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowExercises((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-expanded={showExercises}
                aria-controls={`exercises-${step.id}`}
              >
                <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                Practice exercises
                <motion.span
                  animate={{ rotate: showExercises ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-3 h-3 ml-0.5" aria-hidden="true" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {showExercises && (
                  <motion.ol
                    id={`exercises-${step.id}`}
                    key="exercises"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-2 space-y-1.5 pl-2 list-decimal list-inside overflow-hidden"
                  >
                    {step.practiceExercises.map((exercise, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.2 }}
                        className="text-xs text-muted-foreground leading-relaxed"
                      >
                        {exercise}
                      </motion.li>
                    ))}
                  </motion.ol>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  )
}