/**
 * Backing usage against the house gate, now and under a shock.
 *
 * The design draws the same three rulers on Risk › Exposure and Risk › Margin
 * and says so in its own note — "one computation, cited twice". This is that
 * one computation: the usage comes from Backing & Model's judgment and neither
 * page rebuilds it.
 *
 * Only `now` carries a reading. Usage under a shock needs the pool re-priced at
 * the shocked price, which is Backing's computation and not either caller's, so
 * the shocked rows read `n/c` rather than a projection no page can stand
 * behind — and where usage would cross the gate is never interpolated between
 * two bars.
 */
import { cn } from '@/lib/utils'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from './positionsUi'

/** The house line where Rules would trip auto-derisk. */
export const HOUSE_GATE = 0.85

export interface HeadroomRow {
  label: string
  /** Null when the row has no reading — a shocked usage, today. */
  pct: number | null
}

/** `now` plus the two shocks the design draws, in its order. */
export function headroomRows(usedPct: number | null): HeadroomRow[] {
  return [
    { label: 'now', pct: usedPct },
    { label: 'SPY −5%', pct: null },
    { label: 'SPY −10%', pct: null },
  ]
}

export function BackingHeadroomPanel({
  usedPct,
  foot,
  action,
}: {
  usedPct: number | null
  /** The caller's closing line — each page says what it cites and why. */
  foot: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className={positionsUi.panel} aria-label="Backing headroom under stress">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Backing headroom under stress</span>
        <span className={positionsUi.panelTitle}>usage &rarr; gate {Math.round(HOUSE_GATE * 100)}%</span>
        {action ? <span className="ml-auto">{action}</span> : null}
      </header>
      <div className="flex flex-col gap-2.5 px-3.5 py-3">
        {headroomRows(usedPct).map((h) => (
          <div key={h.label} className="grid grid-cols-[5.75rem_minmax(0,1fr)_3.25rem] items-center gap-2.5">
            <span className="text-dense-meta leading-normal text-muted-foreground">{h.label}</span>
            <span className="relative block h-2 overflow-hidden rounded-sm bg-[var(--sk-surface)]">
              {h.pct == null ? null : (
                <span
                  className={cn('absolute inset-y-0 left-0', h.pct > HOUSE_GATE ? 'bg-lamp-red' : 'bg-warning')}
                  style={{ width: `${Math.min(100, Math.round(h.pct * 100))}%` }}
                />
              )}
              <span className="absolute -inset-y-0.5 left-[85%] w-0.5 bg-lamp-red" />
            </span>
            {h.pct == null ? (
              <span className="inline-flex items-center gap-1 text-dense-caption text-muted-foreground">
                <StatusLamp lamp="gray" variant="dot" title="Not computed here" />
                n/c
              </span>
            ) : (
              <span
                className={cn(
                  positionsUi.mono,
                  'text-right text-xs font-semibold',
                  h.pct > HOUSE_GATE ? 'text-loss' : 'text-foreground',
                )}
              >
                {Math.round(h.pct * 100)}%
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="m-0 border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
        {foot}
      </p>
    </section>
  )
}
