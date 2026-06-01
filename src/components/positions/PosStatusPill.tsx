import type { ReactNode } from 'react'
import { PosStatusBadge, type PosStatusTone } from './ui/PosStatusBadge'

export type { PosStatusTone }

/** @deprecated Use PosStatusBadge from ./ui — kept for existing imports */
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
    <PosStatusBadge tone={tone} className={className}>
      {children}
    </PosStatusBadge>
  )
}
