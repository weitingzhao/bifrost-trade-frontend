import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PosStatusTone = 'brightOk' | 'warn' | 'bad' | 'muted'

const TONE_CLASS: Record<PosStatusTone, string> = {
  brightOk: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  bad: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  muted: 'bg-muted text-muted-foreground border-border',
}

export function PosStatusBadge({
  tone,
  children,
  className,
}: {
  tone: PosStatusTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
