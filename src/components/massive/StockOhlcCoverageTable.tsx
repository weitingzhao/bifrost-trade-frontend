import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ReferenceIndexSymbolCell } from '@/components/massive/ReferenceIndexSymbolCell'
import type { BarCoverageItem } from '@/types/barsCoverage'
import {
  coverageCell,
  coverageCompact,
  coverageRange,
  coverageStatusDisplay,
} from '@/utils/massive/barCoverageDisplay'
import { normCoverageSymbol } from '@/utils/massive/coverageSymbolGroups'

export type CustomBarsPeriodGroup = 'daily' | 'intraday'

export interface StockOhlcCoverageTableProps {
  groups: { label: string; rows: BarCoverageItem[] }[]
  referenceIndices?: { symbol: string; label?: string; polygon_ticker?: string }[]
  isTradingDay: boolean | null
  disabled: boolean
  ohlcHttpBusy: boolean
  onRefreshCoverage: () => void
  onSyncRow: (symbol: string, group: CustomBarsPeriodGroup) => void
}

const STATUS_CLASS: Record<string, string> = {
  ok: 'text-muted-foreground',
  gap: 'text-warning',
  missing: 'text-destructive',
}

export function StockOhlcCoverageTable({
  groups,
  referenceIndices,
  isTradingDay,
  disabled,
  ohlcHttpBusy,
  onRefreshCoverage,
  onSyncRow,
}: StockOhlcCoverageTableProps) {
  const refBySym = new Map(
    (referenceIndices ?? []).map(r => [normCoverageSymbol(r.symbol), r]),
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onRefreshCoverage} disabled={disabled}>
          Refresh coverage
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">1 D</th>
              <th className="px-3 py-2 font-medium">Range</th>
              <th className="px-3 py-2 font-medium">1m</th>
              <th className="px-3 py-2 font-medium">5m</th>
              <th className="px-3 py-2 font-medium">1h</th>
              <th className="px-3 py-2 font-medium">Bars</th>
              <th className="px-3 py-2 font-medium">Sync</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <Fragment key={g.label || 'all'}>
                {g.label ? (
                  <tr className="border-b bg-muted/20">
                    <td colSpan={8} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {g.label}
                    </td>
                  </tr>
                ) : null}
                {g.rows.map(row => {
                  const sym = (row.symbol || '').trim()
                  const ref = refBySym.get(normCoverageSymbol(sym))
                  const daySt = coverageStatusDisplay(row.stock_day?.status)
                  const m1 = row.stock_min?.['1 min'] ?? { count: 0, min_ts: null, max_ts: null }
                  const m5 = row.stock_min?.['5 mins'] ?? { count: 0, min_ts: null, max_ts: null }
                  const h1 = row.stock_min?.['1 hour'] ?? { count: 0, min_ts: null, max_ts: null }
                  const st1 = coverageStatusDisplay(m1.status)
                  const st5 = coverageStatusDisplay(m5.status)
                  const sth = coverageStatusDisplay(h1.status)
                  return (
                    <tr key={`${g.label}-${sym}`} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <ReferenceIndexSymbolCell symbol={sym} reference={ref} />
                      </td>
                      <td
                        className={`px-3 py-2 whitespace-pre-wrap ${STATUS_CLASS[daySt.severity] ?? ''}`}
                        title={coverageCell(row.stock_day, { dailySessionDates: true })}
                      >
                        {daySt.label || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-pre-wrap text-xs text-muted-foreground">
                        {coverageRange(row.stock_day, { dailySessionDates: true })}
                      </td>
                      <td
                        className={`px-3 py-2 ${STATUS_CLASS[st1.severity] ?? ''}`}
                        title={coverageCell(m1)}
                      >
                        {st1.label || '—'}
                      </td>
                      <td
                        className={`px-3 py-2 ${STATUS_CLASS[st5.severity] ?? ''}`}
                        title={coverageCell(m5)}
                      >
                        {st5.label || '—'}
                      </td>
                      <td
                        className={`px-3 py-2 ${STATUS_CLASS[sth.severity] ?? ''}`}
                        title={coverageCell(h1)}
                      >
                        {sth.label || '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div>1m {coverageCompact(m1, st1.needBackfill, isTradingDay)}</div>
                        <div>5m {coverageCompact(m5, st5.needBackfill, isTradingDay)}</div>
                        <div>1h {coverageCompact(h1, sth.needBackfill, isTradingDay)}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={disabled || ohlcHttpBusy}
                            onClick={() => void onSyncRow(sym, 'daily')}
                          >
                            Sync 1 D
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={disabled || ohlcHttpBusy}
                            onClick={() => void onSyncRow(sym, 'intraday')}
                          >
                            Sync intraday
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" asChild>
                            <Link to="/settings/coverage/stock-ib">IB Live bars</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
