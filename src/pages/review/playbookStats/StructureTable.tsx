/**
 * The structure cut's table — `WinRateStructureRow` in full, as the design has
 * it: twelve columns, the service's own totals row leading, and the formulas
 * quoted underneath rather than restated.
 *
 * Invested carries its win/loss split on a second line, which is the one place
 * this table earns its width: a structure with a good return and most of its
 * investment sitting in the losers is a different animal from one with the same
 * return and the money on the winning side.
 */
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd, fmtPct0 } from '@/utils/positions'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import type { StructureRow } from './structureCut'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/**
 * The service hands percentages back already in percent units, so these are
 * printed rather than converted — and to two places, because a structure return
 * of 1.25% and one of 1.31% are a real difference at this scale.
 */
function servicePct(v: number | null): string {
  return v == null ? '—' : `${v.toFixed(2)}%`
}

function serviceUsd(v: number | null): string {
  return v == null ? '—' : fmtUsd(v, true)
}

/** Investment and max risk run to millions; abbreviated so the column can hold them. */
function serviceBig(v: number | null): string {
  return v == null ? '—' : fmtMvAbbrev(v)
}

export function StructureTable({
  rows,
  idByName,
}: {
  rows: readonly StructureRow[]
  /** The rulebook's own id for each shape, so a row can open the chain lit on it. */
  idByName: ReadonlyMap<string, number>
}) {
  return (
    <div className="overflow-x-auto">
      {/* §14.6: twelve columns; Invested carries two lines and the average
          columns carry a dollar figure and a percent, so the floor is wider
          than the play cut's. Measured at 0 clipped cells. */}
      <table className="w-full min-w-[1480px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: '15%' }} />
          <col style={{ width: '4%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '7%' }} />
        </colgroup>
        <thead>
          <tr>
            <th className={cn(positionsUi.th, 'text-left')}>Structure</th>
            <th className={positionsUi.th}>n</th>
            <th className={positionsUi.th}>W–L</th>
            <th className={positionsUi.th}>Win</th>
            <th className={positionsUi.th}>Total profit</th>
            <th className={positionsUi.th}>Total loss</th>
            <th className={cn(positionsUi.th, 'text-left')}>Avg win</th>
            <th className={cn(positionsUi.th, 'text-left')}>Avg loss</th>
            <th className={positionsUi.th}>Invested · W / L</th>
            <th className={positionsUi.th}>Max risk</th>
            <th className={positionsUi.th}>Return</th>
            <th className={positionsUi.th}>Worst single</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              className={cn(
                'hover:[&>td]:bg-[var(--sk-raised2)]',
                r.totals && 'bg-[var(--sk-raised2)] [&>td]:font-semibold',
              )}
            >
              <td className={cn(positionsUi.td, 'pl-2 whitespace-normal text-left font-sans text-foreground')}>
                {r.totals || !idByName.has(r.name) ? (
                  r.name
                ) : (
                  <Link
                    to={`/trade/rules?pick=structure:${idByName.get(r.name)}`}
                    className={positionsUi.link}
                    title="Open the chain lit on this shape"
                  >
                    {r.name}
                  </Link>
                )}
              </td>
              <td className={positionsUi.td}>{r.n}</td>
              <td className={cn(positionsUi.td, 'text-secondary-foreground')}>
                {r.n === 0 ? '—' : `${r.wins}–${r.losses}`}
              </td>
              <td className={cn(positionsUi.td, r.winRate == null ? 'text-muted-foreground' : 'text-foreground')}>
                {r.winRate == null ? '—' : fmtPct0(r.winRate)}
              </td>
              <td className={cn(positionsUi.td, r.totalProfit == null ? 'text-muted-foreground' : 'text-success')}>
                {serviceUsd(r.totalProfit)}
              </td>
              <td className={cn(positionsUi.td, r.totalLoss == null ? 'text-muted-foreground' : 'text-danger')}>
                {serviceUsd(r.totalLoss)}
              </td>
              <td className={cn(positionsUi.td, 'text-left text-secondary-foreground')}>
                {r.avgWinUsd == null ? '—' : `${serviceUsd(r.avgWinUsd)} · ${servicePct(r.avgWinPct)}`}
              </td>
              <td className={cn(positionsUi.td, 'text-left text-muted-foreground')}>
                {r.avgLossUsd == null ? '—' : `${serviceUsd(r.avgLossUsd)} · ${servicePct(r.avgLossPct)}`}
              </td>
              <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                <span className="block text-secondary-foreground">{serviceBig(r.invested)}</span>
                <span className="block text-dense-caption">
                  {r.investedWin == null && r.investedLoss == null
                    ? '—'
                    : `${serviceBig(r.investedWin)} / ${serviceBig(r.investedLoss)}`}
                </span>
              </td>
              <td className={cn(positionsUi.td, 'text-muted-foreground')}>{serviceBig(r.maxRisk)}</td>
              <td
                className={cn(
                  positionsUi.td,
                  r.returnPct == null ? 'text-muted-foreground' : pnlColorClass(r.returnPct),
                )}
              >
                {servicePct(r.returnPct)}
              </td>
              <td className={cn(positionsUi.td, r.worstPct == null ? 'text-muted-foreground' : 'text-danger')}>
                {servicePct(r.worstPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StructureFormulas() {
  return (
    <p className={cn(FOOT, 'm-0')}>
      Quoted from the strategy service, never recomputed here: underlying cost = strike × |qty| × 100 per
      sell-option instance, with the allocation splitting qty where one applies; Total profit is the sum of execution
      net P&amp;L where net &gt; 0 and Total loss the sum where it is negative — one formula for every structure.
      Max risk reads &mdash; where nothing bounds it in cash, which is what a covered call is. The totals row is the
      service&rsquo;s own, not this page summing the rows.
    </p>
  )
}
