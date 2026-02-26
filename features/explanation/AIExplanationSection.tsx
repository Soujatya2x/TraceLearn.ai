'use client'

import { motion } from 'framer-motion'
import { Brain, BookOpen, ListChecks } from 'lucide-react'
import { staggerItem, staggerContainer } from '@/animations/variants'
import type { ErrorExplanation } from '@/types'

interface AIExplanationSectionProps {
  explanation: ErrorExplanation
}

export function AIExplanationSection({ explanation }: AIExplanationSectionProps) {
  return (
    <motion.div variants={staggerItem} className="space-y-4">

      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" aria-hidden="true" />
        <h2 className="text-base font-semibold text-foreground">
          Why This Happened
        </h2>
      </div>

      <div className="p-5 bg-card border border-border rounded-xl">
        <p className="text-sm text-foreground leading-relaxed">
          {explanation.whyItHappened}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex gap-4 p-5 bg-primary/5 border border-primary/20 rounded-xl overflow-hidden"
      >
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/40 rounded-l-xl"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.15, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ originY: 0 }}
        />

        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-xl" aria-hidden="true">
          {explanation.conceptBehindError.icon}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <p className="text-xs text-primary font-semibold uppercase tracking-wide">
              Concept Behind the Error
            </p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {explanation.conceptBehindError.concept}
          </p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {explanation.conceptBehindError.description}
          </p>
        </div>
      </motion.div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">
            Step-by-Step Reasoning
          </p>
        </div>

        <motion.ol
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-2"
        >
          {explanation.stepByStepReasoning.map((step, i) => (
            <motion.li
              key={i}
              variants={staggerItem}
              className="group flex gap-3 text-sm"
            >
              {/* Step number badge — scales in */}
              <motion.span
                className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22, delay: i * 0.07 }}
              >
                {i + 1}
              </motion.span>
              <span className="text-foreground leading-relaxed">{step}</span>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </motion.div>
  )
}