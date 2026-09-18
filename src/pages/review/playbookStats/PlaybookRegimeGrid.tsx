/**
 * Play × regime, in the shape the design draws it and with nothing in it.
 *
 * The design's whole point here is that a play is only quoted for the regime
 * you are in: short premium loses its edge in a vol spike and earns it back in
 * calm-but-high-IV, and one blended win rate hides both halves. No regime read
 * reaches this side, so the grid keeps its columns and carries a marker row
 * rather than being replaced with a paragraph — the reader should see the shape
 * of the answer that is missing, and how wide it is.
 */
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import { REVIEW_UNRECORDED } from '@/utils/reviewTrades'
import type { PlayStat } from '@/utils/reviewTrades'

/** The four the design buckets by, and the ones Home's own regime read would name. */
const REGIMES = ['calm · high IV', 'calm · low IV', 'trend up', 'vol spike']

export function PlaybookRegimeGrid({ plays }: { plays: readonly PlayStat[] }) {
  const rows = plays.slice(0, 8)
  return (
    <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Play × regime">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Play × regime</span>
        <span className={positionsUi.panelTitle}>win rate, and where the sample is thin</span>
        <DenseTag variant="warning" size="cell">
          ⚠ NO REGIME READ
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
                  <td key={r} className={cn(positionsUi.td, 'text-center text-muted-foreground')}>
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
      <p className="m-0 border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
        {REVIEW_UNRECORDED.regime}
      </p>
    </section>
  )
}
