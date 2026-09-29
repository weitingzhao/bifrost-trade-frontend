/**
 * Play × regime, in the shape the design draws it and with nothing in it.
 *
 * The design's whole point here is that a play is only quoted for the regime
 * you are in: short premium loses its edge in a vol spike and earns it back in
 * calm-but-high-IV, and one blended win rate hides both halves. The grid keeps
 * its columns and says why they are empty rather than being replaced with a
 * paragraph — the reader should see the shape of the answer that is missing,
 * and how wide it is.
 *
 * Measured 2026-09-26 on DEV, so the reason is the data's and not a guess:
 * Research does keep a regime history, but per name — the terrain read
 * (`/research/forecast/terrain/history`), whose words are `range` and
 * `trending`, not the design's four market regimes — and it begins 2026-07-13
 * at the earliest (later on some names), after most of the book's option
 * fills (Feb–Jun). Bucketing by it would be a different grid over a fraction
 * of the sample.
 */
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import type { PlayStat } from '@/utils/reviewTrades'

/** The four the design buckets by, and the ones Home's own regime read would name. */
const REGIMES = ['calm · high IV', 'calm · low IV', 'trend up', 'vol spike']

/** A severity edge on a card is inline: `mat-card` clears border-colour classes. */
const WARN_EDGE = { borderColor: 'color-mix(in srgb, var(--color-warning) 45%, transparent)' }

const WHY =
  'The design buckets a play’s record by market regime, so a play is only quoted for the regime you are in. Research keeps a regime per name — the terrain read, range or trending — not the design’s four market regimes, and its history starts in mid-July 2026, after most of this book’s trades were opened. So the rows are the whole sample rather than the relevant slice, which flatters a play that only works in one regime.'

export function PlaybookRegimeGrid({ plays }: { plays: readonly PlayStat[] }) {
  const rows = plays.slice(0, 8)
  return (
    <section className={positionsUi.panel} style={WARN_EDGE} aria-label="Play × regime">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Play × regime</span>
        <span className={positionsUi.panelTitle}>win rate, and where the sample is thin</span>
        <DenseTag variant="warning" size="cell">
          no market-regime history
        </DenseTag>
      </header>
      <div className="overflow-x-auto px-3 py-2.5">
        <table className="w-full min-w-[26rem] border-collapse">
          <thead>
            <tr>
              <th className={cn(positionsUi.th, 'text-left')}>play \ regime</th>
              {REGIMES.map((r) => (
                <th key={r} className={cn(positionsUi.th, 'text-center')}>
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.play}>
                <td
                  className={cn(positionsUi.td, 'max-w-[13rem] truncate text-left font-sans text-secondary-foreground')}
                  title={p.play}
                >
                  {p.play}
                </td>
                {REGIMES.map((r) => (
                  <td
                    key={r}
                    className={cn(positionsUi.td, 'text-center text-muted-foreground')}
                    title={`${p.play} · ${r} · no regime history to bucket it by`}
                  >
                    —
                  </td>
                ))}
              </tr>
            ))}
            {plays.length > rows.length ? (
              <tr>
                <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')} colSpan={5}>
                  and {plays.length - rows.length} more plays
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="m-0 border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
        {WHY}
      </p>
    </section>
  )
}
