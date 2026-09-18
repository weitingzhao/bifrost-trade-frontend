/**
 * The two tables on Single trade: the four exits the trade offered, and the
 * fills that produced the one I took.
 *
 * Both keep their designed columns when a column cannot be read. The
 * counterfactual table has a plan row that prices at n/c; the fills table has
 * Mid and IV heads over a marker, because slippage against the standing mid is
 * the third question on this page and the reader has to see that it is the one
 * being withheld rather than the one that came out flat.
 */
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { fmtIsoDateToken } from '@/lib/format'
import type { ReviewTrade } from '@/utils/reviewTrades'
import type { Counterfactual } from './tradeFitModel'

export function CounterfactualsTable({ rows }: { rows: readonly Counterfactual[] }) {
  return (
    <section className={positionsUi.panel} aria-label="Counterfactuals">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Counterfactuals</span>
        <span className={positionsUi.panelTitle}>Same position, different exits</span>
        <span className="ml-auto text-dense-meta text-muted-foreground">
          every priced row reads off the curve above
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse">
          <thead>
            <tr>
              <th className={cn(positionsUi.th, 'text-left')}>Exit</th>
              <th className={cn(positionsUi.th, 'text-left w-[6.5rem]')}>When</th>
              <th className={cn(positionsUi.th, 'w-[7rem]')}>P&amp;L</th>
              <th className={cn(positionsUi.th, 'w-[7.5rem]')}>vs actual</th>
              <th className={cn(positionsUi.th, 'text-left')}>What the gap is</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.self ? 'bg-primary/5' : undefined}>
                <td
                  className={cn(
                    positionsUi.td,
                    'text-left font-sans',
                    r.self ? 'font-bold text-primary' : 'font-semibold text-foreground',
                  )}
                >
                  {r.name}
                </td>
                <td className={cn(positionsUi.td, 'text-left text-muted-foreground')}>
                  {r.when ? fmtIsoDateToken(r.when) : '—'}
                </td>
                <td
                  className={cn(
                    positionsUi.td,
                    'font-semibold',
                    r.pl == null ? 'text-muted-foreground' : pnlColorClass(r.pl),
                  )}
                >
                  {r.pl == null ? 'n/c' : fmtUsd(r.pl, true)}
                </td>
                <td className={cn(positionsUi.td, r.delta == null ? 'text-muted-foreground' : deltaClass(r.delta))}>
                  {r.self ? '—' : r.delta == null ? 'n/c' : fmtUsd(r.delta, true)}
                </td>
                <td
                  className={cn(
                    positionsUi.td,
                    'whitespace-normal text-left font-sans text-dense-meta leading-normal text-muted-foreground text-pretty',
                  )}
                >
                  {r.meaning}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/**
 * Amber for a branch that beat me, green for one I beat, muted inside noise —
 * a positive delta here means an exit I did not take was worth more, which is
 * not a gain and must not read as one.
 */
function deltaClass(delta: number): string {
  if (Math.abs(delta) < 50) return 'text-muted-foreground'
  return delta > 0 ? 'text-warning' : 'text-[var(--color-profit)]'
}

export function ExecutionTable({ trade }: { trade: ReviewTrade }) {
  return (
    <section className={positionsUi.panel} aria-label="Execution">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Execution</span>
        <span className={positionsUi.panelTitle}>The fills themselves</span>
        <DenseTag variant="warning" size="cell">
          ⚠ NO MID AT SUBMIT
        </DenseTag>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse">
          <thead>
            <tr>
              <th className={cn(positionsUi.th, 'text-left w-[6.5rem]')}>When</th>
              <th className={cn(positionsUi.th, 'text-left w-[5rem]')}>Side</th>
              <th className={cn(positionsUi.th, 'w-[4rem]')}>Qty</th>
              <th className={cn(positionsUi.th, 'w-[6rem]')}>Fill</th>
              <th className={cn(positionsUi.th, 'w-[6rem]')}>Fees</th>
              <th className={cn(positionsUi.th, 'w-[7.5rem]')}>Cash</th>
              <th className={cn(positionsUi.th, 'w-[6rem]')}>Mid</th>
              <th className={cn(positionsUi.th, 'w-[7rem]')}>Slippage</th>
            </tr>
          </thead>
          <tbody>
            {trade.fills.map((f, i) => (
              <tr key={`${f.date}-${i}`}>
                <td className={cn(positionsUi.td, 'text-left text-muted-foreground')}>
                  {f.date ? fmtIsoDateToken(f.date) : '—'}
                </td>
                <td
                  className={cn(
                    positionsUi.td,
                    'text-left font-sans',
                    f.side === 'sell' ? 'text-[var(--color-profit)]' : 'text-foreground',
                  )}
                >
                  {f.side === 'sell' ? 'Sell' : 'Buy'}
                </td>
                <td className={positionsUi.td}>{f.qty}</td>
                <td className={positionsUi.td}>{f.price.toFixed(2)}</td>
                <td className={cn(positionsUi.td, 'text-muted-foreground')}>{f.commission.toFixed(2)}</td>
                <td className={cn(positionsUi.td, pnlColorClass(f.cash))}>{fmtUsd(f.cash, true)}</td>
                <td className={cn(positionsUi.td, 'text-muted-foreground')}>—</td>
                <td className={cn(positionsUi.td, 'text-muted-foreground')}>—</td>
              </tr>
            ))}
            <tr>
              <td className={cn(positionsUi.td, 'text-left font-sans font-semibold text-foreground')} colSpan={5}>
                Realised
              </td>
              <td className={cn(positionsUi.td, 'font-bold', pnlColorClass(trade.realised))}>
                {fmtUsd(trade.realised, true)}
              </td>
              <td className={cn(positionsUi.td, 'text-muted-foreground')} colSpan={2}>
                n/c
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="m-0 border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
        Slippage is the fill against the mid standing when the order was submitted, and nothing on this side records
        that mid — not the broker&rsquo;s Flex report, not the executions table. It is a separate question from either
        gap above, and the only one of the three a better limit price would fix.
      </p>
    </section>
  )
}
