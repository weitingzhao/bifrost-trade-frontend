import type { SepaSnapshotByTypeRow } from '@/types/stockDataReadiness'
import { fmt } from '@/utils/stockDataReadiness/format'
import { ReadinessCode } from './ReadinessStepPrimitives'
import { readinessStepUi } from './stockDataReadinessStepUi'
import { cn } from '@/lib/utils'

export function SnapshotByTypeBreakdown({ rows }: { rows: SepaSnapshotByTypeRow[] | null }) {
  if (rows == null) return null
  if (rows.length === 0) {
    return (
      <div className={readinessStepUi.asideEmpty}>
        No instrument-type breakdown yet — refresh once to populate{' '}
        <ReadinessCode>cache_stock_snapshot</ReadinessCode>.
      </div>
    )
  }

  const totalSnap = rows.reduce((s, r) => s + (r.snapshot_row_count || 0), 0)
  const totalUni = rows.reduce((s, r) => s + (r.universe_ticker_count || 0), 0)

  return (
    <div className={readinessStepUi.aside}>
      <div className={readinessStepUi.asideTitle}>
        <span>
          Instrument types in <ReadinessCode>cache_stock_snapshot</ReadinessCode>
        </span>
        <span className={readinessStepUi.asideMeta}>
          {rows.length} types · {fmt(totalSnap)} snapshot rows · {fmt(totalUni)} universe tickers
        </span>
      </div>
      <div className={readinessStepUi.snapTableWrap}>
        <table className={readinessStepUi.snapTable}>
          <thead>
            <tr>
              <th className={readinessStepUi.snapTh}>Code</th>
              <th className={readinessStepUi.snapTh}>Description</th>
              <th className={cn(readinessStepUi.snapTh, readinessStepUi.snapNum)}>Snapshot rows</th>
              <th className={cn(readinessStepUi.snapTh, readinessStepUi.snapNum)}>Universe tickers</th>
              <th className={cn(readinessStepUi.snapTh, readinessStepUi.snapNum)}>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const coverage =
                r.universe_ticker_count > 0
                  ? (r.snapshot_row_count / r.universe_ticker_count) * 100
                  : null
              const lowCoverage = coverage != null && coverage < 90
              const isLast = i === rows.length - 1
              return (
                <tr key={r.code}>
                  <td className={cn(readinessStepUi.snapTd, readinessStepUi.snapCode, isLast && readinessStepUi.snapTdLast)}>
                    <span className={readinessStepUi.snapCodePill}>{r.code}</span>
                  </td>
                  <td className={cn(readinessStepUi.snapTd, isLast && readinessStepUi.snapTdLast)}>
                    {r.description ?? <span className={readinessStepUi.snapDim}>—</span>}
                  </td>
                  <td className={cn(readinessStepUi.snapTd, readinessStepUi.snapNum, isLast && readinessStepUi.snapTdLast)}>
                    {fmt(r.snapshot_row_count)}
                  </td>
                  <td
                    className={cn(
                      readinessStepUi.snapTd,
                      readinessStepUi.snapNum,
                      readinessStepUi.snapDim,
                      isLast && readinessStepUi.snapTdLast,
                    )}
                  >
                    {fmt(r.universe_ticker_count)}
                  </td>
                  <td
                    className={cn(
                      readinessStepUi.snapTd,
                      readinessStepUi.snapNum,
                      lowCoverage && readinessStepUi.snapLow,
                      isLast && readinessStepUi.snapTdLast,
                    )}
                  >
                    {coverage == null ? '—' : `${coverage.toFixed(1)}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
