import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PosStatusTone = 'brightOk' | 'warn' | 'bad'

const toneClass: Record<PosStatusTone, string> = {
  brightOk:
    'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  warn: 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400',
  bad: 'border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-400',
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
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
