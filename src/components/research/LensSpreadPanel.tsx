/**
 * The Tape panel: is it breadth, or is it one name?
 *
 * Both ratings prototypes put this under the weights — a one-line read of the
 * working set, then one thin three-part bar per lens. It answers the question
 * a ranked list cannot: whether the top of the list is the market or a
 * handful of names. Shared for the same reason as the weights panel, and kept
 * deliberately quiet: it is a caption for the list beside it, not the page's
 * subject. An earlier draft drew tall blocks in two columns and read as the
 * headline.
 *
 * The buckets and their thresholds belong to the caller — the Stocks page cuts
 * its own 0–100 scores at 70 and 40, the vol page reads the flags its engine
 * published — so this component counts nothing. It draws what it is handed and
 * prints the two numbers that matter, strong and weak, under each bar.
 */
import { SectionPanel, SECTION_CAP_CLASS } from '@/components/layout'
import { cn } from '@/lib/utils'

export interface LensSpread {
  key: string
  label: string
  hot: number
  mid: number
  cold: number
  /** How many names carry a reading for this lens at all. */
  scored: number
  /** Hover text for the strong / middle / weak segments, in that order. */
  titles?: [string, string, string]
}

/** Static classes only — Tailwind cannot see a computed column count. */
const COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
}

export function LensSpreadPanel({
  label,
  sentence,
  note,
  spreads,
  caption,
}: {
  /** The verdict in two words — "Rich tape", "Mixed tape". */
  label: string
  /** The same verdict as a sentence, naming the counts it read. */
  sentence: string
  note?: string
  spreads: readonly LensSpread[]
  caption: React.ReactNode
}) {
  return (
    <SectionPanel cap="Tape" title={label} note={note}>
      <p className="px-3 py-2 text-dense-meta leading-relaxed text-muted-foreground">{sentence}</p>
      <div className={cn('grid gap-2 px-3 pb-2', COLS[spreads.length] ?? 'grid-cols-5')}>
        {spreads.map((sp) => {
          const total = Math.max(1, sp.scored)
          return (
            <div key={sp.key} className="min-w-0">
              <div className={cn(SECTION_CAP_CLASS, 'truncate')}>{sp.label}</div>
              <div className="mt-1 flex h-2.5 gap-px overflow-hidden rounded-sm">
                <span
                  className="block bg-[var(--color-profit)]/70"
                  style={{ width: `${(sp.hot / total) * 100}%` }}
                  title={sp.titles?.[0]}
                />
                <span
                  className="block bg-secondary"
                  style={{ width: `${(sp.mid / total) * 100}%` }}
                  title={sp.titles?.[1]}
                />
                <span
                  className="block bg-destructive/70"
                  style={{ width: `${(sp.cold / total) * 100}%` }}
                  title={sp.titles?.[2]}
                />
              </div>
              <div className="mt-0.5 font-mono text-dense-caption text-muted-foreground">
                {sp.hot} / {sp.cold}
              </div>
            </div>
          )
        })}
      </div>
      <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        {caption}
      </p>
    </SectionPanel>
  )
}
