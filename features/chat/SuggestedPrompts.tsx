'use client'

import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/animations/variants'

interface SuggestedPromptsProps {
  prompts: string[]
  onSelect: (prompt: string) => void
}

export function SuggestedPrompts({ prompts, onSelect }: SuggestedPromptsProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-wrap gap-2 justify-start"
    >
      {prompts.map((prompt, i) => (
        <motion.button
          key={i}
          type="button"
          variants={staggerItem}
          onClick={() => onSelect(prompt)}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="px-3 py-1.5 text-xs font-medium rounded-full border border-border/70 bg-muted text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
        >
          {prompt}
        </motion.button>
      ))}
    </motion.div>
  )
}