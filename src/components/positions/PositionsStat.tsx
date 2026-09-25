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
  /** `lg` for a page's headline figures (§17.4's panel reading, 20), `base` inside a band (16). */
  size?: 'base' | 'lg'
}) {
  // §17.4: a stat in a reading strip — label, figure, sub-line — whose type
  // comes from `styles/patterns`; the caller gives colour only. The panel
  // size is a style: the stat rule outranks the panel rule on a stat's own
  // figure.
  return (
    <span data-sr-kpi="stat">
      <span data-sr-kpi-l="">{cap}</span>
      <span
        data-sr-kpi-v={size === 'lg' ? 'panel' : ''}
        className={ink ?? 'text-foreground'}
        style={size === 'lg' ? { fontSize: 20 } : undefined}
      >
        {value}
      </span>
      {sub ? <span data-sr-kpi-s="">{sub}</span> : null}
    </span>
  )
}
