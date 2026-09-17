/**
 * One figure with its caption and the line that qualifies it.
 *
 * The block every Portfolio and Risk page opens with: a caption, the number,
 * and one line saying what the number is of. It had been written four times —
 * Backing's verdict, P&L Explain's tie-out, Exposure's totals and Margin's
 * broker stats — with the same three parts and slightly different spacing each
 * time, which is exactly the drift a shared primitive exists to stop.
 *
 * `ink` is a class rather than a tone name because the colour is the caller's
 * reading: a direction colour comes from `pnlColorClass`, a fault from
 * `text-warning`, and nothing here decides which of those a figure deserves.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { positionsUi } from './positionsUi'

export function PositionsStat({
  cap,
  value,
  sub,
  ink,
  size = 'base',
}: {
  cap: string
  value: string
  /** What the number is of — a fragment, not a sentence. */
  sub?: ReactNode
  /** The caller's ink class for the figure; muted when it has no reading. */
  ink?: string
  /** `lg` for a page's headline figures, `base` inside a band. */
  size?: 'base' | 'lg'
}) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className={positionsUi.cap}>{cap}</span>
      <span
        className={cn(
          positionsUi.mono,
          'leading-normal font-bold',
          size === 'lg' ? 'text-lg' : 'text-base',
          ink ?? 'text-foreground',
        )}
      >
        {value}
      </span>
      {sub ? <span className="text-dense-caption leading-normal text-muted-foreground">{sub}</span> : null}
    </span>
  )
}
