'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useCallback, useRef } from 'react'
import { Zap, Terminal, TrendingUp, Tag, Quote } from 'lucide-react'

// ─── Floating glass cards for the left panel ─────────────────

const GLASS_CARDS = [
  {
    id: 'error',
    icon: Terminal,
    iconColor: '#ef4444',
    title: 'Error Detected',
    content: 'ZeroDivisionError: division by zero\n  File "main.py", line 8\n  return total / len(numbers)',
    accent: '#ef4444',
    top: '4%', left: '5%',
    rotate: -2,
    delay: 0.2,
    mono: true,
  },
  {
    id: 'mastery',
    icon: TrendingUp,
    iconColor: '#06b6d4',
    title: 'Concept Mastery',
    content: null,
    accent: '#06b6d4',
    top: '62%', left: '3%',
    rotate: 2.5,
    delay: 0.35,
    mono: false,
    mastery: 82,
  },
  {
    id: 'tags',
    icon: Tag,
    iconColor: '#a78bfa',
    title: 'Concepts Learned',
    content: null,
    accent: '#a78bfa',
    top: '33%', left: '52%',
    rotate: -1.5,
    delay: 0.5,
    mono: false,
    tags: ['error-handling', 'defensive-programming', 'runtime-debugging', 'guard-clauses'],
  },
]

function FloatingCard({ card, index }: { card: typeof GLASS_CARDS[0]; index: number }) {
  const Icon = card.icon
  const floatY = index % 2 === 0 ? [-0, -6, 0] : [0, 5, 0]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: 1, y: floatY, scale: 1,
      }}
      transition={{
        opacity: { delay: card.delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        scale:   { delay: card.delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        y: {
          delay: card.delay + 0.6,
          duration: 4 + index,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: index * 0.3,
        },
      }}
      style={{
        position: 'absolute',
        top: card.top,
        left: card.left,
        rotate: card.rotate,
        width: card.id === 'error' ? 248 : card.id === 'mastery' ? 178 : 215,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${card.accent}30`,
        boxShadow: `0 0 28px ${card.accent}20, inset 0 1px 0 rgba(255,255,255,0.07)`,
        borderRadius: 16,
        padding: '10px 12px',
        overflow: 'hidden',
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${card.accent}20` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: card.accent }} />
          </div>
          <span className="text-[11px] font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {card.title}
          </span>
        </div>

        {/* Code snippet */}
        {card.mono && card.content && (
          <pre
            className="text-[10px] leading-relaxed font-mono rounded-lg p-2"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.06)', whiteSpace: 'pre-wrap' }}
          >
            {card.content}
          </pre>
        )}

        {/* Mastery bar */}
        {'mastery' in card && card.mastery && (
          <div>
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Error Handling</span>
              <span className="text-xl font-bold" style={{ color: card.accent }}>{card.mastery}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${card.accent}, #7c3aed)` }}
                initial={{ width: 0 }}
                animate={{ width: `${card.mastery}%` }}
                transition={{ delay: card.delay + 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        )}

        {/* Tags */}
        {'tags' in card && card.tags && (
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${card.accent}18`, color: card.accent, border: `1px solid ${card.accent}30` }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Tab switcher ─────────────────────────────────────────────

function AuthTabs({ active }: { active: 'sign-in' | 'sign-up' }) {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const nextSuffix = next !== '/' ? `?next=${encodeURIComponent(next)}` : ''

  return (
    <div
      className="flex rounded-xl p-1 mb-4 relative"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <motion.div
        className="absolute top-1 bottom-1 rounded-lg"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', boxShadow: '0 0 16px rgba(79,70,229,0.4)' }}
        initial={false}
        animate={{ left: active === 'sign-in' ? 4 : '50%', width: 'calc(50% - 4px)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
      <Link
        href={`/auth/sign-in${nextSuffix}`}
        className="relative flex-1 text-center text-[13px] font-semibold py-2 rounded-lg transition-colors z-10"
        style={{ color: active === 'sign-in' ? '#fff' : 'rgba(255,255,255,0.45)' }}
      >
        Sign In
      </Link>
      <Link
        href={`/auth/sign-up${nextSuffix}`}
        className="relative flex-1 text-center text-[13px] font-semibold py-2 rounded-lg transition-colors z-10"
        style={{ color: active === 'sign-up' ? '#fff' : 'rgba(255,255,255,0.45)' }}
      >
        Sign Up
      </Link>
    </div>
  )
}

// ─── Main layout ──────────────────────────────────────────────

interface AuthLayoutProps {
  children: React.ReactNode
  activeTab: 'sign-in' | 'sign-up'
}

export function AuthLayout({ children, activeTab }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex" style={{ background: '#0a0d14', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── LEFT PANEL ──────────────────────────────────────── */}
      <div
        className="hidden lg:flex w-[52%] flex-shrink-0 relative overflow-hidden flex-col justify-between p-7"
        style={{ background: 'linear-gradient(135deg, #080b12 0%, #0d1120 50%, #0f1629 100%)' }}
      >
        {/* Mesh gradient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 65%)' }} />
          <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 65%)' }} />
          <div className="absolute top-[40%] right-[10%] w-[250px] h-[250px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 65%)' }} />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', boxShadow: '0 0 20px rgba(79,70,229,0.4)' }}
          >
            <img src="/apple-icon.png" alt="TraceLearn.ai" className="w-full h-full object-cover" draggable={false}  />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>
            TraceLearn<span style={{ color: '#06b6d4' }}>.ai</span>
          </span>
        </motion.div>

        {/* Hero text + cards */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              className="text-[2rem] font-black leading-[1.1] tracking-tight mb-3"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            >
              Debug smarter.<br />
              <span style={{
                background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Learn faster.
              </span>
            </h1>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
              AI-powered debugging. Understand every error, not just fix it. Build a personalized knowledge graph as you code.
            </p>
          </motion.div>

          {/* Floating glass cards */}
          <div className="relative mt-4" style={{ height: 260 }}>
            {GLASS_CARDS.map((card, i) => (
              <FloatingCard key={card.id} card={card} index={i} />
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="relative z-10 rounded-2xl p-3.5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Quote className="w-3.5 h-3.5 mb-1.5" style={{ color: '#06b6d4' }} />
          <p className="text-xs leading-relaxed mb-2.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
            TraceLearn helped me finally understand <em>why</em> my code failed — not just fix it. It&apos;s like having a senior dev explain every bug.
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', color: '#fff' }}>
              A
            </div>
            <div>
              <p className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Aryan Mehta</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Full-Stack Developer</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-4 relative"
        style={{ background: '#0d1117' }}
      >
        {/* Right panel ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px]"
            style={{ background: 'radial-gradient(circle at 80% 10%, rgba(79,70,229,0.1) 0%, transparent 60%)' }} />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px]"
            style={{ background: 'radial-gradient(circle at 20% 90%, rgba(6,182,212,0.08) 0%, transparent 60%)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px] relative"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'radial-gradient(circle at 80% 10%, rgba(79,70,229,0.1) 0%, transparent 60%)' }}
            >
              <img src="/apple-icon.png" alt="TraceLearn.ai" className="w-full h-full object-cover" draggable={false}  />
            </div>
            <span className="text-base font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              TraceLearn<span style={{ color: '#06b6d4' }}>.ai</span>
            </span>
          </div>

          {/* Tabs */}
          <AuthTabs active={activeTab} />

          {/* Form glass card */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}