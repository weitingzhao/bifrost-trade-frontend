import { Link } from 'react-router-dom'
import { DenseDataTable } from '@/components/data-display/DenseTable'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  OptionBarsContractsGapResult,
  OptionContractsReferenceGapResult,
  OptionSnapshotsContractsGapResult,
  WatchlistDbCoverageOptionBars,
  WatchlistDbCoverageSymbolRow,
} from '@/types/watchlistDbCoverage'
import type { OptionsFocusDataset } from '@/utils/dataOverview/optionFocusDataset'
import { showFocusTable } from '@/utils/dataOverview/optionFocusDataset'
import {
  completenessPctClass,
  covPctClass,
  fmtAgeSeconds,
  fmtTs,
  formatCovPctCell,
  formatGapCell,
  formatGapPairCell,
  formatMassiveRefCell,
  gapNumClass,
  matrixCellClass,
} from '@/utils/dataOverview/watchlistMatrixFormat'

const EMPTY_BARS: WatchlistDbCoverageOptionBars = {
  has_data: false,
  row_count: null,
  last_bar_time: null,
  last_created_at: null,
  ohlc_complete_pct: null,
  volume_pct: null,
  vwap_pct: null,
  optional_avg_pct: null,
  distinct_expirations: null,
  distinct_contracts: null,
}

function rowOptionDay(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageOptionBars {
  return r.option_day ?? EMPTY_BARS
}
function rowOptionMin(r: WatchlistDbCoverageSymbolRow): WatchlistDbCoverageOptionBars {
  return r.option_min ?? EMPTY_BARS
}

export interface OptionWatchlistMatrixProps {
  wlRows: WatchlistDbCoverageSymbolRow[]
  focusDataset: OptionsFocusDataset
  comparePool: string[]
  onToggleComparePool?: (symbol: string) => void
  refGapBySymbol: Record<string, OptionContractsReferenceGapResult>
  snapshotGapBySymbol: Record<string, OptionSnapshotsContractsGapResult>
  barsGapBySymbol: Record<string, OptionBarsContractsGapResult>
}

export function OptionWatchlistMatrix({
  wlRows,
  focusDataset,
  comparePool,
  onToggleComparePool,
  refGapBySymbol,
  snapshotGapBySymbol,
  barsGapBySymbol,
}: OptionWatchlistMatrixProps) {
  const show = (t: Parameters<typeof showFocusTable>[1]) => showFocusTable(focusDataset, t)
  const poolable =
    focusDataset === 'option_contracts' ||
    focusDataset === 'option_snapshots' ||
    focusDataset === 'option_day' ||
    focusDataset === 'option_min'

  const gapForRow = (symU: string) => {
    if (focusDataset === 'option_snapshots') return snapshotGapBySymbol[symU]
    if (focusDataset === 'option_day' || focusDataset === 'option_min') return barsGapBySymbol[symU]
    return refGapBySymbol[symU]
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <DenseDataTable tableClassName="text-xs min-w-[720px]">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 font-medium">Symbol</th>
            {show('option_contracts') ? (
              <th colSpan={10} className="px-3 py-2 font-medium">
                option_contracts
              </th>
            ) : null}
            {show('option_snapshots') ? (
              <th colSpan={7} className="px-3 py-2 font-medium">
                option_snapshots
              </th>
            ) : null}
            {show('option_day') ? (
              <th colSpan={7} className="px-3 py-2 font-medium">
                option_day
              </th>
            ) : null}
            {show('option_min') ? (
              <th colSpan={7} className="px-3 py-2 font-medium">
                option_min
              </th>
            ) : null}
            {show('option_snapshots_with_underlying_day') ? (
              <th colSpan={3} className="px-3 py-2 font-medium">
                option_snapshots_with_underlying_day
              </th>
            ) : null}
            {show('option_expiration_cache') ? (
              <th colSpan={2} className="px-3 py-2 font-medium">
                option_expiration_cache
              </th>
            ) : null}
            {show('option_open_interest_daily') ? (
              <th colSpan={3} className="px-3 py-2 font-medium">
                option_open_interest_daily
              </th>
            ) : null}
            {show('report_option_atm_iv_daily') ? (
              <th colSpan={2} className="px-3 py-2 font-medium">
                report_option_atm_iv_daily
              </th>
            ) : null}
            {show('report_option_max_pain_daily') ? (
              <th colSpan={3} className="px-3 py-2 font-medium">
                report_option_max_pain_daily
              </th>
            ) : null}
          </tr>
          <tr className="border-b bg-muted/20 text-left text-[10px] text-muted-foreground">
            <th className="sticky left-0 z-10 bg-muted/20 px-3 py-1" />
            {show('option_snapshots') ? (
              <>
                <th className="px-3 py-1">Age since last snapshot</th>
                <th className="px-3 py-1">Completeness</th>
                <th className="px-3 py-1">Rows</th>
                <th className="px-3 py-1">Ref</th>
                <th className="px-3 py-1">Gap</th>
                <th className="px-3 py-1">Cov%</th>
                <th className="px-3 py-1">OC exp / stk</th>
              </>
            ) : null}
            {show('option_contracts') ? (
              <>
                <th className="px-3 py-1">Age</th>
                <th className="px-3 py-1">Last check</th>
                <th className="px-3 py-1">ID %</th>
                <th className="px-3 py-1">NULL %</th>
                <th className="px-3 py-1">C gap</th>
                <th className="px-3 py-1">Rows</th>
                <th className="px-3 py-1">Ref</th>
                <th className="px-3 py-1">Row gap</th>
                <th className="px-3 py-1">Cov%</th>
                <th className="px-3 py-1">Expiries / strikes</th>
              </>
            ) : null}
            {(show('option_day') || show('option_min')) && !show('option_snapshots') ? (
              <>
                <th className="px-3 py-1">Age</th>
                <th className="px-3 py-1">Completeness</th>
                <th className="px-3 py-1">Rows</th>
                <th className="px-3 py-1">Ref</th>
                <th className="px-3 py-1">Gap</th>
                <th className="px-3 py-1">Cov%</th>
                <th className="px-3 py-1">Exp / Contracts</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {wlRows.map(r => {
            const oc = r.option_contracts
            const os = r.option_snapshots
            const symU = r.symbol.trim().toUpperCase()
            const refG = refGapBySymbol[symU]
            const snapG = snapshotGapBySymbol[symU]
            const inPool = comparePool.includes(symU)
            const g = gapForRow(symU)

            const ticker = oc.ticker_pct
            const ident = oc.identity_pct
            const refMergedPct =
              oc.has_data && ticker != null && ident != null
                ? Math.round(((ticker + ident) / 2) * 10) / 10
                : null
            const dataAvgPct = oc.optional_data_fill_avg_pct

            const ivp = os.iv_pct
            const fgp = os.full_greeks_pct
            const snapRefMerged =
              os.has_data && ivp != null && fgp != null
                ? Math.round(((ivp + fgp) / 2) * 10) / 10
                : null
            const snapDataAvg = os.optional_data_fill_avg_pct

            const od = rowOptionDay(r)
            const om = rowOptionMin(r)
            const barRow = focusDataset === 'option_min' ? om : od
            const barCompleteness =
              barRow.has_data && barRow.ohlc_complete_pct != null && barRow.optional_avg_pct != null
                ? `${barRow.ohlc_complete_pct}% · ${barRow.optional_avg_pct}%`
                : '—'

            const symbolCell =
              poolable && onToggleComparePool ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant={inPool ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 font-mono text-xs"
                    aria-pressed={inPool}
                    onClick={() => onToggleComparePool(r.symbol)}
                  >
                    {r.symbol}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-1 text-xs" asChild>
                    <Link to="/settings/coverage/option" title="Open option coverage">
                      ↗
                    </Link>
                  </Button>
                </div>
              ) : (
                <span className="font-mono text-xs font-semibold">{r.symbol}</span>
              )

            return (
              <tr
                key={r.symbol}
                className={cn('border-b last:border-0', inPool && poolable && 'bg-primary/5')}
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-normal"
                >
                  {symbolCell}
                </th>

                {show('option_snapshots') ? (
                  <>
                    <td className={matrixCellClass()}>
                      {os.has_data
                        ? fmtAgeSeconds(os.age_seconds ?? null)
                        : '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {os.has_data && snapRefMerged != null ? (
                        <span>
                          <span className={completenessPctClass(snapRefMerged)}>{snapRefMerged}%</span>
                          {snapDataAvg != null ? (
                            <span className="text-muted-foreground"> · {snapDataAvg}%</span>
                          ) : null}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={matrixCellClass()}>
                      {os.has_data && os.row_count != null ? os.row_count.toLocaleString() : '—'}
                    </td>
                    <td className={matrixCellClass()}>{formatMassiveRefCell(snapG)}</td>
                    <td className={matrixCellClass(gapNumClass(snapG?.gap))}>
                      {formatGapPairCell(formatGapCell(snapG), os.stale_snapshot_rows)}
                    </td>
                    <td className={matrixCellClass(covPctClass(snapG?.coverage_pct))}>
                      {formatCovPctCell(snapG)}
                    </td>
                    <td className={matrixCellClass()}>
                      {oc.has_data
                        ? `${oc.distinct_expirations ?? '—'} / ${oc.distinct_strikes ?? '—'}`
                        : '—'}
                    </td>
                  </>
                ) : null}

                {show('option_contracts') ? (
                  <>
                    <td className={matrixCellClass()}>
                      {oc.has_data ? fmtAgeSeconds(oc.age_seconds) : '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {oc.has_data ? fmtAgeSeconds(oc.last_check_age_seconds) : '—'}
                    </td>
                    <td className={matrixCellClass(refMergedPct != null ? completenessPctClass(refMergedPct) : '')}>
                      {refMergedPct != null ? `${refMergedPct}%` : '—'}
                    </td>
                    <td className={matrixCellClass(dataAvgPct != null ? completenessPctClass(dataAvgPct) : '')}>
                      {dataAvgPct != null ? `${dataAvgPct}%` : '—'}
                    </td>
                    <td className={matrixCellClass(oc.column_gap_count > 0 ? 'text-amber-600 dark:text-amber-500' : '')}>
                      {oc.has_data ? String(oc.column_gap_count) : '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {oc.has_data && oc.row_count != null ? oc.row_count.toLocaleString() : '—'}
                    </td>
                    <td className={matrixCellClass()}>{formatMassiveRefCell(refG)}</td>
                    <td className={matrixCellClass(gapNumClass(refG?.gap))}>
                      {formatGapPairCell(formatGapCell(refG), oc.mapping_mismatch_count)}
                    </td>
                    <td className={matrixCellClass(covPctClass(refG?.coverage_pct))}>
                      {formatCovPctCell(refG)}
                    </td>
                    <td className={matrixCellClass()}>
                      {oc.has_data
                        ? `${oc.distinct_expirations ?? '—'} / ${oc.distinct_strikes ?? '—'}`
                        : '—'}
                    </td>
                  </>
                ) : null}

                {(show('option_day') || show('option_min')) && !show('option_snapshots') && !show('option_contracts') ? (
                  <>
                    <td className={matrixCellClass()}>
                      {barRow.has_data ? fmtAgeSeconds(null) : '—'}
                    </td>
                    <td className={matrixCellClass()}>{barCompleteness}</td>
                    <td className={matrixCellClass()}>
                      {barRow.has_data && barRow.row_count != null
                        ? barRow.row_count.toLocaleString()
                        : '—'}
                    </td>
                    <td className={matrixCellClass()}>{formatMassiveRefCell(g)}</td>
                    <td className={matrixCellClass(gapNumClass(g?.gap))}>{formatGapCell(g)}</td>
                    <td className={matrixCellClass(covPctClass(g?.coverage_pct))}>
                      {formatCovPctCell(g)}
                    </td>
                    <td className={matrixCellClass()}>
                      {barRow.has_data
                        ? `${barRow.distinct_expirations ?? '—'} / ${barRow.distinct_contracts ?? '—'}`
                        : '—'}
                    </td>
                  </>
                ) : null}

                {show('option_snapshots_with_underlying_day') ? (
                  <>
                    <td className={matrixCellClass()}>
                      {r.option_snapshots_with_underlying_day?.row_count?.toLocaleString() ?? '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {fmtTs(r.option_snapshots_with_underlying_day?.last_snapshot_ts ?? null)}
                    </td>
                    <td className={matrixCellClass()}>
                      {fmtTs(r.option_snapshots_with_underlying_day?.last_created_at ?? null)}
                    </td>
                  </>
                ) : null}

                {show('option_expiration_cache') ? (
                  <>
                    <td className={matrixCellClass()}>
                      {r.option_expiration_cache?.row_count?.toLocaleString() ?? '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {fmtTs(r.option_expiration_cache?.last_updated_at ?? null)}
                    </td>
                  </>
                ) : null}

                {show('option_open_interest_daily') ? (
                  <>
                    <td className={matrixCellClass()}>
                      {r.option_open_interest_daily?.row_count?.toLocaleString() ?? '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {r.option_open_interest_daily?.last_trade_date ?? '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {fmtTs(r.option_open_interest_daily?.last_created_at ?? null)}
                    </td>
                  </>
                ) : null}

                {show('report_option_atm_iv_daily') ? (
                  <>
                    <td className={matrixCellClass()}>
                      {r.report_option_atm_iv_daily?.atm_iv_last_trade_date ?? '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {fmtTs(r.report_option_atm_iv_daily?.atm_iv_last_created_at ?? null)}
                    </td>
                  </>
                ) : null}

                {show('report_option_max_pain_daily') ? (
                  <>
                    <td className={matrixCellClass()}>
                      {r.report_option_max_pain_daily?.row_count?.toLocaleString() ?? '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {r.report_option_max_pain_daily?.last_trade_date ?? '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {fmtTs(r.report_option_max_pain_daily?.last_created_at ?? null)}
                    </td>
                  </>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </DenseDataTable>
    </div>
  )
}
