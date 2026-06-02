import type { ReactNode } from 'react'
import { DenseTag } from '@/components/data-display/DenseTag'
import { denseTagVariantFromTone, type DenseTagVariant } from '@/components/data-display/denseTagClasses'

export type PosStatusTone = 'brightOk' | 'warn' | 'bad'

export function PosStatusBadge({
  tone,
  children,
  className,
  variant,
}: {
  tone?: PosStatusTone
  children: ReactNode
  className?: string
  variant?: DenseTagVariant
}) {
  const tagVariant = variant ?? (tone != null ? denseTagVariantFromTone(tone) : 'neutral')
  return (
    <DenseTag variant={tagVariant} size="cell" className={className}>
      {children}
    </DenseTag>
  )
}
