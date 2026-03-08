'use client'

import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  idle:       { label: 'Idle',       color: 'bg-muted text-muted-foreground',                              dot: 'bg-muted-foreground'          },
  processing: { label: 'Processing', color: 'bg-warning/10 text-green-700 border border-warning/20', dot: 'bg-warning animate-pulse'  },
  analyzing:  { label: 'Analyzing',  color: 'bg-primary/10 text-primary border border-primary/20',        dot: 'bg-primary animate-pulse'     },
  validating: { label: 'Validating', color: 'bg-primary/10 text-primary border border-primary/20',        dot: 'bg-primary animate-pulse'     },
  completed:  { label: 'Completed',  color: 'bg-success/10 text-success-foreground border border-success/20', dot: 'bg-success'               },
  failed:     { label: 'Failed',     color: 'bg-destructive/10 text-destructive border border-destructive/20', dot: 'bg-destructive'          },
  CREATED:    { label: 'Created',    color: 'bg-muted text-muted-foreground',                              dot: 'bg-muted-foreground animate-pulse' },
  EXECUTING:  { label: 'Executing',  color: 'bg-warning/10 text-warning-foreground border border-warning/20', dot: 'bg-warning animate-pulse'  },
  ANALYZING:  { label: 'Analyzing',  color: 'bg-primary/10 text-primary border border-primary/20',        dot: 'bg-primary animate-pulse'     },
  ANALYZED:   { label: 'Analyzed',   color: 'bg-success/10 text-success-foreground border border-success/20', dot: 'bg-success'               },
  COMPLETED:  { label: 'Completed',  color: 'bg-success/10 text-success-foreground border border-success/20', dot: 'bg-success'               },
  ERROR:      { label: 'Error',      color: 'bg-destructive/10 text-destructive border border-destructive/20', dot: 'bg-destructive'          },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status ?? 'Unknown',
    color: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.color, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}