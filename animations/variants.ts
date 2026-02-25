// ============================================================
// TraceLearn.ai — Framer Motion Reusable Animation Variants
// ============================================================

import type { Variants } from 'framer-motion'

// ─── Page Transitions ────────────────────────────────────────

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

// ─── Container / Stagger ─────────────────────────────────────

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
}

// ─── Card Slide Up ───────────────────────────────────────────

export const cardSlideUp: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
}

// ─── Fade In ─────────────────────────────────────────────────

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

// ─── Button Interaction ──────────────────────────────────────

export const buttonTap = {
  whileTap: { scale: 0.96 },
  whileHover: { scale: 1.02 },
  transition: { duration: 0.15, ease: 'easeInOut' },
}

// ─── Success Animation ───────────────────────────────────────

export const successBounce: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 25,
      delay: 0.1,
    },
  },
}

// ─── Error Shake ─────────────────────────────────────────────

export const errorShake: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
}

// ─── Upload Animation ────────────────────────────────────────

export const uploadPulse: Variants = {
  initial: { scale: 1, opacity: 0.6 },
  animate: {
    scale: [1, 1.06, 1],
    opacity: [0.6, 1, 0.6],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
}

// ─── Download Animation ──────────────────────────────────────

export const downloadSlide: Variants = {
  initial: { y: -4, opacity: 0 },
  animate: {
    y: [-4, 4, 0],
    opacity: [0, 1, 1],
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

// ─── Diff Highlight Sweep ────────────────────────────────────

export const diffSweep: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, delay: i * 0.03, ease: 'easeOut' },
  }),
}

// ─── Sidebar Item ────────────────────────────────────────────

export const sidebarItem: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
}

// ─── Skeleton Pulse ──────────────────────────────────────────

export const skeletonPulse: Variants = {
  initial: { opacity: 0.6 },
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
}

// ─── Processing Morph ────────────────────────────────────────

export const processingMorph: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
}

// ─── Chat Message ────────────────────────────────────────────

export const chatMessageIn: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  },
}

// ─── Progress Bar ────────────────────────────────────────────

export const progressBar: Variants = {
  initial: { scaleX: 0, originX: 0 },
  animate: (pct: number) => ({
    scaleX: pct / 100,
    originX: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
}
