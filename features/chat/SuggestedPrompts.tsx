'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/animations/variants'

interface SuggestedPromptsProps {
  prompts: string[]
  onSelect: (prompt: string) => void
}

export function SuggestedPrompts({ prompts, onSelect }: SuggestedPromptsProps) {
  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-muted-foreground/60" aria-hidden="true" />
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          Suggested
        </span>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-wrap gap-2"
      >
        {prompts.map((prompt, i) => (
          <motion.button
            key={i}
            type="button"
            variants={staggerItem}
            onClick={() => onSelect(prompt)}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="px-3 py-1.5 text-xs bg-muted/70 hover:bg-muted border border-border hover:border-primary/30 hover:text-primary rounded-full transition-colors"
          >
            {prompt}
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}