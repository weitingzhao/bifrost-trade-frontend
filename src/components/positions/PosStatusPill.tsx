import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PosStatusTone = 'ok' | 'brightOk' | 'warn' | 'bad' | 'neutral'

const toneClass: Record<PosStatusTone, string> = {
  ok: 'pos-status--ok',
  brightOk: 'pos-status--bright-ok',
  warn: 'pos-status--warn',
  bad: 'pos-status--bad',
  neutral: 'pos-status--neutral',
}

export function PosStatusPill({
  tone,
  children,
  className,
}: {
  tone: PosStatusTone
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn('pos-status', toneClass[tone], className)}>
      {children}
    </span>
  )
}
