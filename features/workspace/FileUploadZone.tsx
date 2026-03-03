'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { Upload, FileText, X, CheckCircle2, CloudUpload, Zap, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DetectResult } from '@/services/api/analysisService'

// ─── Props ────────────────────────────────────────────────────────────────────

interface FileUploadZoneProps {
  label: string
  accept?: string
  onFile: (file: File | null) => void
  currentFile: File | null          // ← MUST be wired to real state, not hardcoded null
  hint?: string
  enableDetection?: boolean
  onDetect?: (result: DetectResult | null) => void
}

// ─── Framework config ─────────────────────────────────────────────────────────

const FRAMEWORK_CONFIG: Record<string, {
  label: string; color: string; glow: string; border: string; bg: string; tokens: string[]
}> = {
  springboot: {
    label: 'Spring Boot', color: '#4ade80', glow: 'rgba(74,222,128,0.35)',
    border: 'rgba(74,222,128,0.4)', bg: 'rgba(74,222,128,0.06)',
    tokens: ['@SpringBootApplication', '@RestController', '@Autowired', '@Entity',
             'extends JpaRepository', '@GetMapping', '@PostMapping', 'SpringApplication.run'],
  },
  fastapi: {
    label: 'FastAPI', color: '#2dd4bf', glow: 'rgba(45,212,191,0.35)',
    border: 'rgba(45,212,191,0.4)', bg: 'rgba(45,212,191,0.06)',
    tokens: ['from fastapi import', '@app.get(', '@app.post(', 'FastAPI()',
             'from pydantic import', 'BaseModel', 'uvicorn.run(', 'Depends('],
  },
  django: {
    label: 'Django', color: '#a3e635', glow: 'rgba(163,230,53,0.35)',
    border: 'rgba(163,230,53,0.4)', bg: 'rgba(163,230,53,0.06)',
    tokens: ['from django', 'models.Model', 'views.py', 'settings.py', 'manage.py'],
  },
  express: {
    label: 'Express', color: '#facc15', glow: 'rgba(250,204,21,0.35)',
    border: 'rgba(250,204,21,0.4)', bg: 'rgba(250,204,21,0.06)',
    tokens: ["require('express')", 'app.get(', 'app.post(', 'router.use(', 'app.listen('],
  },
}

const GENERIC_SCAN_TOKENS = [
  '@RestController', 'from fastapi import', '@SpringBootApplication',
  'BaseModel', '@Entity', 'app.get(', 'import org.springframework',
  'uvicorn.run(', '@Autowired', 'Depends(',
]

// ─── CircuitTraceBorder — racing dashes around card perimeter ────────────────

function CircuitTraceBorder({ active }: { active: boolean }) {
  const c = 'hsl(var(--primary))'
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ zIndex: 2 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Top — left→right */}
          <motion.span className="absolute top-0 left-0 h-[1.5px] rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)`, width: '38%' }}
            initial={{ x: '-100%' }} animate={{ x: '370%' }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.1 }} />
          {/* Bottom — right→left */}
          <motion.span className="absolute bottom-0 right-0 h-[1.5px] rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)`, width: '38%' }}
            initial={{ x: '100%' }} animate={{ x: '-370%' }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.55, repeatDelay: 0.1 }} />
          {/* Left — bottom→top */}
          <motion.span className="absolute left-0 bottom-0 w-[1.5px] rounded-full"
            style={{ background: `linear-gradient(180deg, transparent, ${c}, transparent)`, height: '38%' }}
            initial={{ y: '100%' }} animate={{ y: '-260%' }}
            transition={{ duration: 0.95, repeat: Infinity, ease: 'easeInOut', delay: 0.26, repeatDelay: 0.15 }} />
          {/* Right — top→bottom */}
          <motion.span className="absolute right-0 top-0 w-[1.5px] rounded-full"
            style={{ background: `linear-gradient(180deg, transparent, ${c}, transparent)`, height: '38%' }}
            initial={{ y: '-100%' }} animate={{ y: '260%' }}
            transition={{ duration: 0.95, repeat: Infinity, ease: 'easeInOut', delay: 0.78, repeatDelay: 0.15 }} />
          {/* Corner sparks */}
          {[{top:-2,left:-2},{top:-2,right:-2},{bottom:-2,left:-2},{bottom:-2,right:-2}].map((pos,i) => (
            <motion.span key={i} className="absolute w-[5px] h-[5px] rounded-full"
              style={{ ...pos, background: c, boxShadow: `0 0 6px 1px ${c}` }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.3, 0.7] }}
              transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut', delay: i * 0.21 }} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── RadarRipple — sonar rings from file icon ────────────────────────────────

function RadarRipple({ active }: { active: boolean }) {
  const c = 'hsl(var(--primary))'
  return (
    <AnimatePresence>
      {active && [0, 0.38, 0.76].map((delay, i) => (
        <motion.span key={i} className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ border: `1px solid ${c}` }}
          initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut', delay }} />
      ))}
    </AnimatePresence>
  )
}

// ─── TokenScroller — code tokens scroll while scanning ───────────────────────

function TokenScroller({ tokens }: { tokens: string[] }) {
  const [idx, setIdx] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    ref.current = setInterval(() => setIdx(i => (i + 1) % tokens.length), 650)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [tokens])
  return (
    <div className="overflow-hidden h-3.5 flex items-center flex-1 min-w-0">
      <AnimatePresence mode="wait">
        <motion.span key={idx}
          initial={{ y: 7, opacity: 0 }} animate={{ y: 0, opacity: 0.7 }} exit={{ y: -7, opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="text-[9px] font-mono truncate whitespace-nowrap"
          style={{ color: 'hsl(var(--primary))' }}
        >
          {tokens[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

// ─── ScanProgress — THE KEY ANIMATION: percentage bar + counter ──────────────

function ScanProgress({ scanning, pct }: { scanning: boolean; pct: number }) {
  return (
    <AnimatePresence>
      {scanning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2 pt-1 pb-0.5">
            {/* Progress bar track */}
            <div className="flex-1 h-[3px] rounded-full bg-primary/15 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, hsl(var(--primary)/0.6), hsl(var(--primary)), hsl(var(--primary)/0.8))',
                  backgroundSize: '200% 100%',
                }}
                animate={{
                  width: `${pct}%`,
                  backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
                }}
                transition={{
                  width: { duration: 0.3, ease: 'easeOut' },
                  backgroundPosition: { duration: 1.2, repeat: Infinity, ease: 'linear' },
                }}
              />
            </div>
            {/* Percentage counter */}
            <motion.span
              className="text-[9px] font-mono font-bold tabular-nums flex-shrink-0"
              style={{ color: 'hsl(var(--primary))' }}
              key={pct}
            >
              {pct}%
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── FrameworkChip — pops in after detection ─────────────────────────────────

function FrameworkChip({ result }: { result: DetectResult }) {
  const cfg = result.detectedFramework ? FRAMEWORK_CONFIG[result.detectedFramework] : null

  if (result.mode === 'LIVE_EXECUTION') {
    return (
      <motion.div initial={{ scale: 0.7, opacity: 0, y: 4 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.7, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 650, damping: 22 }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border"
        style={{ background: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.3)' }}
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 700, damping: 16, delay: 0.08 }}>
          <Zap className="w-2.5 h-2.5" style={{ color: '#4ade80' }} />
        </motion.div>
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#4ade80' }}>Sandbox ready</span>
      </motion.div>
    )
  }

  if (!cfg) return null

  return (
    <motion.div initial={{ scale: 0.7, opacity: 0, y: 4 }} animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.7, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 650, damping: 22 }}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <motion.div initial={{ rotate: -15 }} animate={{ rotate: 0 }} transition={{ type: 'spring', stiffness: 700, damping: 16, delay: 0.1 }}>
        <AlertTriangle className="w-2.5 h-2.5" style={{ color: cfg.color }} />
      </motion.div>
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
        {cfg.label} · upload log file
      </span>
    </motion.div>
  )
}

// ─── Preserved helpers ────────────────────────────────────────────────────────

function OrbitParticle({ angle, radius, delay }: { angle: number; radius: number; delay: number }) {
  return (
    <motion.span className="absolute w-1.5 h-1.5 rounded-full bg-primary/60 pointer-events-none"
      style={{ left: '50%', top: '50%' }}
      animate={{
        x: [Math.cos((angle*Math.PI)/180)*radius, Math.cos(((angle+360)*Math.PI)/180)*radius],
        y: [Math.sin((angle*Math.PI)/180)*radius, Math.sin(((angle+360)*Math.PI)/180)*radius],
        opacity: [0.4,1,0.4], scale: [0.8,1.2,0.8],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', delay,
        opacity: { duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay },
        scale: { duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay },
      }} />
  )
}

function ShimmerSweep() {
  return (
    <motion.span className="absolute inset-0 rounded-xl pointer-events-none"
      style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)', backgroundSize: '200% 100%' }}
      initial={{ backgroundPosition: '-100% 0' }} animate={{ backgroundPosition: '200% 0' }}
      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }} />
  )
}

function BurstParticle({ angle }: { angle: number }) {
  const rad = (angle * Math.PI) / 180
  return (
    <motion.span className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full bg-primary pointer-events-none"
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x: Math.cos(rad)*28, y: Math.sin(rad)*28, opacity: 0, scale: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }} />
  )
}

function UploadProgressBar({ onDone }: { onDone: () => void }) {
  return (
    <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"
        initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} onAnimationComplete={onDone} />
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FileUploadZone({
  label, accept = '*', onFile, currentFile, hint,
  enableDetection = false, onDetect,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging]     = useState(false)
  const [isUploading, setIsUploading]   = useState(false)
  const [showBurst, setShowBurst]       = useState(false)
  const [isHovering, setIsHovering]     = useState(false)
  const [isScanning, setIsScanning]     = useState(false)
  const [scanPct, setScanPct]           = useState(0)          // 0→100
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null)
  const [scanTokens, setScanTokens]     = useState(GENERIC_SCAN_TOKENS)
  const inputRef = useRef<HTMLInputElement>(null)
  const pctTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentPctRef = useRef(0)   // tracks live pct value without stale closure

  const mouseX  = useMotionValue(0)
  const mouseY  = useMotionValue(0)
  const rotateX = useTransform(useSpring(mouseY, { stiffness: 300, damping: 30 }), [-0.5, 0.5], [4, -4])
  const rotateY = useTransform(useSpring(mouseX, { stiffness: 300, damping: 30 }), [-0.5, 0.5], [-4, 4])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLLabelElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }, [mouseX, mouseY])

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0); mouseY.set(0); setIsHovering(false)
  }, [mouseX, mouseY])

  // Animate percentage from 0 to a cap, then sprint to 100 when done
  const startPctAnimation = useCallback((cap: number, durationMs: number) => {
    currentPctRef.current = 0
    setScanPct(0)
    if (pctTimerRef.current) clearInterval(pctTimerRef.current)
    const steps = 40
    const stepMs = durationMs / steps
    const stepSize = cap / steps
    pctTimerRef.current = setInterval(() => {
      const next = Math.min(currentPctRef.current + stepSize + Math.random() * 1.5, cap)
      currentPctRef.current = next
      setScanPct(Math.round(next))
      if (next >= cap && pctTimerRef.current) {
        clearInterval(pctTimerRef.current)
      }
    }, stepMs)
  }, [])

  const finishPct = useCallback(() => {
    if (pctTimerRef.current) clearInterval(pctTimerRef.current)
    // Sprint from current ref value to 100
    const sprint = setInterval(() => {
      const next = Math.min(currentPctRef.current + 6, 100)
      currentPctRef.current = next
      setScanPct(next)
      if (next >= 100) clearInterval(sprint)
    }, 25)
  }, [])

  const runDetection = useCallback(async (file: File) => {
    if (!enableDetection) return
    setIsScanning(true)
    setDetectResult(null)
    setScanTokens(GENERIC_SCAN_TOKENS)

    // Animate pct to ~85 over ~2 seconds while API call runs
    startPctAnimation(85, 2000)

    try {
      const { detectFramework } = await import('@/services/api/analysisService')   // dynamic import to avoid loading API code before file upload
      const result = await detectFramework(file)

      // Switch to framework tokens briefly
      if (result.detectedFramework && FRAMEWORK_CONFIG[result.detectedFramework]) {
        setScanTokens(FRAMEWORK_CONFIG[result.detectedFramework].tokens)
        await new Promise(r => setTimeout(r, 350))
      }

      // Sprint to 100%
      finishPct()
      await new Promise(r => setTimeout(r, 320))  // let 100% show for a beat

      setDetectResult(result)
      onDetect?.(result)
    } catch {
      finishPct()
      await new Promise(r => setTimeout(r, 300))
      const fallback: DetectResult = { mode: 'LIVE_EXECUTION', detectedFramework: null, confidence: 0, reason: 'Detection unavailable' }
      setDetectResult(fallback)
      onDetect?.(fallback)
    } finally {
      setIsScanning(false)
      setScanPct(0)
    }
  }, [enableDetection, onDetect, startPctAnimation, finishPct])

  // Clean up timer on unmount
  useEffect(() => () => { if (pctTimerRef.current) clearInterval(pctTimerRef.current) }, [])

  const handleFile = useCallback((file: File) => {
    setShowBurst(true)
    setIsUploading(true)
    setDetectResult(null)
    setScanPct(0)
    currentPctRef.current = 0
    setTimeout(() => setShowBurst(false), 600)
    onFile(file)          // ← this updates the store; currentFile prop will become non-null
    runDetection(file)
  }, [onFile, runDetection])

  const handleRemove = useCallback(() => {
    onFile(null)
    setDetectResult(null)
    setIsScanning(false)
    setScanPct(0)
    currentPctRef.current = 0
    if (pctTimerRef.current) clearInterval(pctTimerRef.current)
    onDetect?.(null)
  }, [onFile, onDetect])

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }, [])
  const handleDrop      = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }, [handleFile])
  const handleChange    = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }, [handleFile])

  const cfg         = detectResult?.detectedFramework ? FRAMEWORK_CONFIG[detectResult.detectedFramework] : null
  const resultColor = cfg?.color ?? '#4ade80'

  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>

      <AnimatePresence mode="wait">
        {/* ── FILE CARD — shown when currentFile is non-null ───────────────── */}
        {currentFile ? (
          <motion.div key="file-card"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="relative flex flex-col gap-0 px-3 py-3 border rounded-xl overflow-hidden transition-[background,border-color] duration-500"
            style={{
              background: isScanning ? 'hsl(var(--card))' : cfg ? cfg.bg : detectResult ? 'rgba(74,222,128,0.05)' : 'hsl(var(--card))',
              borderColor: isScanning ? 'hsl(var(--primary) / 0.4)' : cfg ? cfg.border : detectResult ? 'rgba(74,222,128,0.3)' : 'hsl(var(--border))',
            }}
          >
            <ShimmerSweep />
            {enableDetection && <CircuitTraceBorder active={isScanning} />}

            {/* Left accent bar */}
            <motion.span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
              initial={{ scaleY: 0 }}
              animate={{
                scaleY: 1,
                backgroundColor: isScanning ? 'hsl(var(--primary))' : resultColor,
                boxShadow: isScanning ? '0 0 8px hsl(var(--primary)/0.5)' : `0 0 8px ${cfg?.glow ?? 'rgba(74,222,128,0.4)'}`,
              }}
              transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ originY: 0.5 }} />

            {/* File info row */}
            <div className="flex items-center gap-3">
              {/* File icon + radar ripple */}
              <div className="relative flex-shrink-0">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.05 }}
                  className="relative w-8 h-8 rounded-lg flex items-center justify-center z-10"
                  style={{ background: isScanning ? 'hsl(var(--primary)/0.1)' : cfg ? `${cfg.color}18` : 'rgba(74,222,128,0.1)' }}
                >
                  {enableDetection && <RadarRipple active={isScanning} />}
                  <FileText className="w-4 h-4 relative z-10"
                    style={{ color: isScanning ? 'hsl(var(--primary))' : resultColor }} />
                </motion.div>
              </div>

              {/* Name + subtitle */}
              <div className="flex-1 min-w-0">
                <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.28 }}
                  className="text-xs font-semibold text-foreground truncate">
                  {currentFile.name}
                </motion.p>
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.16, duration: 0.28 }}
                  className="flex items-center gap-1.5 mt-0.5 h-3.5 overflow-hidden">
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {(currentFile.size / 1024).toFixed(1)} KB
                  </span>
                  {enableDetection ? (
                    <>
                      <span className="text-[10px] text-muted-foreground/40 flex-shrink-0">·</span>
                      {isScanning
                        ? <TokenScroller tokens={scanTokens} />
                        : detectResult
                          ? <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                              className="text-[10px] text-muted-foreground">
                              {detectResult.mode === 'LOG_ANALYSIS' ? 'framework detected' : 'standalone code'}
                            </motion.span>
                          : null}
                    </>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">· ready</span>
                  )}
                </motion.div>
              </div>

              {/* Spinner → checkmark */}
              <AnimatePresence mode="wait">
                {isScanning ? (
                  <motion.div key="spinner"
                    initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="flex-shrink-0">
                    <motion.div className="w-4 h-4 rounded-full border-[1.5px]"
                      style={{ borderColor: 'hsl(var(--primary)/0.2)', borderTopColor: 'hsl(var(--primary))' }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                  </motion.div>
                ) : (
                  <motion.div key="check"
                    initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 22, delay: 0.08 }}
                    className="flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" style={{ color: resultColor }} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remove */}
              <motion.button type="button" onClick={handleRemove} aria-label="Remove file"
                whileHover={{ scale: 1.15, rotate: 90 }} whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            {/* ── Percentage progress bar — visible while scanning ─────────── */}
            {enableDetection && (
              <ScanProgress scanning={isScanning} pct={scanPct} />
            )}

            {/* ── Framework chip — slides in after scan ────────────────────── */}
            <AnimatePresence>
              {enableDetection && !isScanning && detectResult && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden pt-2 pl-11">
                  <FrameworkChip result={detectResult} />
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>

        ) : (
          /* ── DROPZONE ─────────────────────────────────────────────────────── */
          <motion.label key="dropzone"
            htmlFor={`upload-${label}`}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onMouseMove={handleMouseMove} onMouseEnter={() => setIsHovering(true)} onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 600 }}
            animate={isDragging ? { scale: 1.03, borderColor: 'hsl(var(--primary))' } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className={cn(
              'relative flex flex-col items-center justify-center gap-2.5 py-5 px-3',
              'border-2 border-dashed rounded-xl cursor-pointer select-none overflow-hidden transition-colors duration-200',
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/40',
            )}
          >
            {(['tl','tr','bl','br'] as const).map((pos) => (
              <motion.span key={pos} className="absolute w-3 h-3 border-primary pointer-events-none"
                style={{
                  top: pos.startsWith('t') ? 6 : undefined, bottom: pos.startsWith('b') ? 6 : undefined,
                  left: pos.endsWith('l') ? 6 : undefined, right: pos.endsWith('r') ? 6 : undefined,
                  borderTopWidth: pos.startsWith('t') ? 2 : 0, borderBottomWidth: pos.startsWith('b') ? 2 : 0,
                  borderLeftWidth: pos.endsWith('l') ? 2 : 0, borderRightWidth: pos.endsWith('r') ? 2 : 0,
                  borderRadius: pos==='tl'?'4px 0 0 0':pos==='tr'?'0 4px 0 0':pos==='bl'?'0 0 0 4px':'0 0 4px 0',
                }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={isHovering || isDragging ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2, delay: 0.03 }} />
            ))}

            <AnimatePresence>
              {isDragging && (
                <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {[0,45,90,135,180,225,270,315].map((angle,i) => <OrbitParticle key={angle} angle={angle} radius={36} delay={i*0.12} />)}
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showBurst && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {[0,40,80,120,160,200,240,280,320].map((a) => <BurstParticle key={a} angle={a} />)}
                </div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {isDragging && (
                <motion.span className="absolute inset-0 pointer-events-none rounded-xl"
                  style={{ background: 'radial-gradient(ellipse at center, hsl(var(--primary)/0.12) 0%, transparent 70%)' }}
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.3 }} />
              )}
            </AnimatePresence>

            <div className="relative">
              <motion.div
                className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-colors', isDragging ? 'bg-primary/15' : isHovering ? 'bg-primary/10' : 'bg-muted')}
                animate={isDragging
                  ? { y: [-2,2,-2], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } }
                  : isHovering ? { y: [-1,1,-1], transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }
                  : { y: 0 }}>
                <AnimatePresence mode="wait">
                  {isDragging
                    ? <motion.div key="cloud" initial={{ scale: 0, rotate: -15, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0, rotate: 15, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}><CloudUpload className="w-5 h-5 text-primary" /></motion.div>
                    : <motion.div key="upload" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.18 }}><Upload className={cn('w-5 h-5 transition-colors', isHovering ? 'text-primary' : 'text-muted-foreground')} /></motion.div>
                  }
                </AnimatePresence>
              </motion.div>
            </div>

            <div className="text-center space-y-0.5">
              <AnimatePresence mode="wait">
                {isDragging
                  ? <motion.p key="drop" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="text-xs font-semibold text-primary">Drop to upload</motion.p>
                  : <motion.p key="idle" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="text-xs text-muted-foreground"><span className="text-primary font-semibold">Click to upload</span>{' '}or drag & drop</motion.p>
                }
              </AnimatePresence>
              {hint && <p className="text-[10px] text-muted-foreground/55">{hint}</p>}
            </div>

            <AnimatePresence>
              {isUploading && <UploadProgressBar onDone={() => setIsUploading(false)} />}
            </AnimatePresence>

            <input ref={inputRef} id={`upload-${label}`} type="file" accept={accept}
              aria-label={`Upload ${label}`} title={`Upload ${label}`}
              className="sr-only" onChange={handleChange} />
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  )
}