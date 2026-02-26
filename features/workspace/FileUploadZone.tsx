'use client'

import { useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { Upload, FileText, X, CheckCircle2, CloudUpload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadZoneProps {
  label: string
  accept?: string
  onFile: (file: File | null) => void
  currentFile: File | null
  hint?: string
}


function OrbitParticle({ angle, radius, delay }: { angle: number; radius: number; delay: number }) {
  return (
    <motion.span
      className="absolute w-1.5 h-1.5 rounded-full bg-primary/60 pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
      }}
      animate={{
        x: [
          Math.cos((angle * Math.PI) / 180) * radius,
          Math.cos(((angle + 360) * Math.PI) / 180) * radius,
        ],
        y: [
          Math.sin((angle * Math.PI) / 180) * radius,
          Math.sin(((angle + 360) * Math.PI) / 180) * radius,
        ],
        opacity: [0.4, 1, 0.4],
        scale: [0.8, 1.2, 0.8],
      }}
      transition={{
        duration: 2.2,
        repeat: Infinity,
        ease: 'linear',
        delay,
        opacity: { duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay },
        scale:   { duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay },
      }}
    />
  )
}


function UploadProgressBar({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={onDone}
      />
    </motion.div>
  )
}


function ShimmerSweep() {
  return (
    <motion.span
      className="absolute inset-0 rounded-xl pointer-events-none"
      style={{
        background:
          'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
        backgroundSize: '200% 100%',
      }}
      initial={{ backgroundPosition: '-100% 0' }}
      animate={{ backgroundPosition: '200% 0' }}
      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
    />
  )
}


function BurstParticle({ angle }: { angle: number }) {
  const rad = (angle * Math.PI) / 180
  return (
    <motion.span
      className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full bg-primary pointer-events-none"
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x: Math.cos(rad) * 28,
        y: Math.sin(rad) * 28,
        opacity: 0,
        scale: 0,
      }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    />
  )
}


export function FileUploadZone({
  label,
  accept = '*',
  onFile,
  currentFile,
  hint,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging]       = useState(false)
  const [isUploading, setIsUploading]     = useState(false)
  const [showBurst, setShowBurst]         = useState(false)
  const [isHovering, setIsHovering]       = useState(false)
  const inputRef                          = useRef<HTMLInputElement>(null)

  // Mouse-tilt effect on the dropzone
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useTransform(useSpring(mouseY, { stiffness: 300, damping: 30 }), [-0.5, 0.5], [4, -4])
  const rotateY = useTransform(useSpring(mouseX, { stiffness: 300, damping: 30 }), [-0.5, 0.5], [-4, 4])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLLabelElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }, [mouseX, mouseY])

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0)
    mouseY.set(0)
    setIsHovering(false)
  }, [mouseX, mouseY])

  const handleFile = useCallback(
    (file: File) => {
      setShowBurst(true)
      setIsUploading(true)
      setTimeout(() => setShowBurst(false), 600)
      onFile(file)
    },
    [onFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the zone entirely (not a child element)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      // Reset so same file can be re-uploaded
      e.target.value = ''
    },
    [handleFile],
  )

  const orbitAngles = [0, 45, 90, 135, 180, 225, 270, 315]

  return (
    <div className="space-y-1.5">
      {/* Label */}
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
        {label}
      </span>

      <AnimatePresence mode="wait">

        {currentFile ? (
          <motion.div
            key="file-card"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="relative flex items-center gap-3 px-3 py-3 bg-emerald-500/8 border border-emerald-500/25 rounded-xl overflow-hidden"
          >
            <ShimmerSweep />

            <motion.span
              className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-emerald-500"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ originY: 0.5 }}
            />

            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.05 }}
              className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0"
            >
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.28 }}
                className="text-xs font-semibold text-foreground truncate"
              >
                {currentFile.name}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.16, duration: 0.28 }}
                className="text-[10px] text-muted-foreground mt-0.5"
              >
                {(currentFile.size / 1024).toFixed(1)} KB · ready
              </motion.p>
            </div>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.18 }}
              className="flex-shrink-0"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </motion.div>

            <motion.button
              type="button"
              onClick={() => onFile(null)}
              aria-label="Remove file"
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </motion.div>

        ) : (

          <motion.label
            key="dropzone"
            htmlFor={`upload-${label}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 600 }}
            animate={
              isDragging
                ? { scale: 1.03, borderColor: 'hsl(var(--primary))' }
                : { scale: 1 }
            }
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className={cn(
              'relative flex flex-col items-center justify-center gap-2.5 py-5 px-3',
              'border-2 border-dashed rounded-xl cursor-pointer select-none overflow-hidden',
              'transition-colors duration-200',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 hover:bg-muted/40',
            )}
          >
            {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
              <motion.span
                key={pos}
                className="absolute w-3 h-3 border-primary pointer-events-none"
                style={{
                  top:    pos.startsWith('t') ? 6 : undefined,
                  bottom: pos.startsWith('b') ? 6 : undefined,
                  left:   pos.endsWith('l')   ? 6 : undefined,
                  right:  pos.endsWith('r')   ? 6 : undefined,
                  borderTopWidth:    pos.startsWith('t') ? 2 : 0,
                  borderBottomWidth: pos.startsWith('b') ? 2 : 0,
                  borderLeftWidth:   pos.endsWith('l')   ? 2 : 0,
                  borderRightWidth:  pos.endsWith('r')   ? 2 : 0,
                  borderRadius:
                    pos === 'tl' ? '4px 0 0 0' :
                    pos === 'tr' ? '0 4px 0 0' :
                    pos === 'bl' ? '0 0 0 4px' : '0 0 4px 0',
                }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={isHovering || isDragging ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2, delay: 0.03 }}
              />
            ))}

            <AnimatePresence>
              {isDragging && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {orbitAngles.map((angle, i) => (
                    <OrbitParticle key={angle} angle={angle} radius={36} delay={i * 0.12} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showBurst && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((a) => (
                    <BurstParticle key={a} angle={a} />
                  ))}
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isDragging && (
                <motion.span
                  className="absolute inset-0 pointer-events-none rounded-xl"
                  style={{
                    background:
                      'radial-gradient(ellipse at center, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
                  }}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </AnimatePresence>

            <div className="relative">
              <motion.div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                  isDragging
                    ? 'bg-primary/15'
                    : isHovering
                    ? 'bg-primary/10'
                    : 'bg-muted',
                )}
                animate={
                  isDragging
                    ? { y: [-2, 2, -2], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } }
                    : isHovering
                    ? { y: [-1, 1, -1], transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }
                    : { y: 0 }
                }
              >
                <AnimatePresence mode="wait">
                  {isDragging ? (
                    <motion.div
                      key="cloud"
                      initial={{ scale: 0, rotate: -15, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0, rotate: 15, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    >
                      <CloudUpload className="w-5 h-5 text-primary" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="upload"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Upload
                        className={cn(
                          'w-5 h-5 transition-colors',
                          isHovering ? 'text-primary' : 'text-muted-foreground',
                        )}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            <div className="text-center space-y-0.5">
              <AnimatePresence mode="wait">
                {isDragging ? (
                  <motion.p
                    key="drop-text"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="text-xs font-semibold text-primary"
                  >
                    Drop to upload
                  </motion.p>
                ) : (
                  <motion.p
                    key="idle-text"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="text-xs text-muted-foreground"
                  >
                    <span className="text-primary font-semibold">Click to upload</span>
                    {' '}or drag & drop
                  </motion.p>
                )}
              </AnimatePresence>
              {hint && (
                <p className="text-[10px] text-muted-foreground/55">{hint}</p>
              )}
            </div>

            <AnimatePresence>
              {isUploading && (
                <UploadProgressBar onDone={() => setIsUploading(false)} />
              )}
            </AnimatePresence>

            <input
              ref={inputRef}
              id={`upload-${label}`}
              type="file"
              accept={accept}
              aria-label={`Upload ${label}`}
              title={`Upload ${label}`}
              className="sr-only"
              onChange={handleInputChange}
            />
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  )
}