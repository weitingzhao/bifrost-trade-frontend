import { DenseDataTable } from '@/components/data-display/DenseTable'
import type { WatchlistDbCoverageSymbolRow } from '@/types/watchlistDbCoverage'
import type { StocksFocusDataset } from '@/utils/dataOverview/stockFocusDataset'
import { showStocksFocusTable } from '@/utils/dataOverview/stockFocusDataset'
import { fmtTs, matrixCellClass } from '@/utils/dataOverview/watchlistMatrixFormat'

export interface DataOverviewWatchlistStocksProps {
  wlRows: WatchlistDbCoverageSymbolRow[]
  focusDataset: StocksFocusDataset
}

export function DataOverviewWatchlistStocks({ wlRows, focusDataset }: DataOverviewWatchlistStocksProps) {
  const show = (t: 'stock_day' | 'stock_min') => showStocksFocusTable(focusDataset, t)

  return (
    <div className="overflow-x-auto rounded-md border">
      <DenseDataTable tableClassName="text-xs min-w-[480px]">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2">Symbol</th>
            {show('stock_day') ? <th colSpan={4} className="px-3 py-2">stock_day</th> : null}
            {show('stock_min') ? <th colSpan={4} className="px-3 py-2">stock_min</th> : null}
          </tr>
          <tr className="border-b bg-muted/20 text-[10px] text-muted-foreground">
            <th className="sticky left-0 z-10 bg-muted/20 px-3 py-1" />
            {show('stock_day') ? (
              <>
                <th className="px-3 py-1">Rows</th>
                <th className="px-3 py-1">Last bar</th>
                <th className="px-3 py-1">OHLC %</th>
                <th className="px-3 py-1">Dates</th>
              </>
            ) : null}
            {show('stock_min') ? (
              <>
                <th className="px-3 py-1">Rows</th>
                <th className="px-3 py-1">Last bar</th>
                <th className="px-3 py-1">OHLC %</th>
                <th className="px-3 py-1">Periods</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {wlRows.map(r => {
            const sd = r.stock_day
            const sm = r.stock_min ?? { has_data: false }
            return (
              <tr key={r.symbol} className="border-b last:border-0">
                <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 font-mono text-xs">
                  {r.symbol}
                </th>
                {show('stock_day') ? (
                  <>
                    <td className={matrixCellClass()}>
                      {sd.has_data && sd.row_count != null ? sd.row_count.toLocaleString() : '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {sd.has_data ? fmtTs(sd.stock_day_last_bar ?? sd.stock_day_last_created_at) : '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {sd.ohlc_complete_pct != null ? `${sd.ohlc_complete_pct}%` : '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {sd.distinct_bar_dates != null ? String(sd.distinct_bar_dates) : '—'}
                    </td>
                  </>
                ) : null}
                {show('stock_min') ? (
                  <>
                    <td className={matrixCellClass()}>
                      {sm.has_data && sm.row_count != null ? sm.row_count.toLocaleString() : '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {sm.has_data ? fmtTs(sm.last_bar_time ?? sm.last_created_at ?? null) : '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {sm.ohlc_complete_pct != null ? `${sm.ohlc_complete_pct}%` : '—'}
                    </td>
                    <td className={matrixCellClass()}>
                      {sm.distinct_periods != null ? String(sm.distinct_periods) : '—'}
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

export function DataOverviewStocksUtilitiesSection({
  wlRows,
}: {
  wlRows: WatchlistDbCoverageSymbolRow[]
}) {
  const n = wlRows.length
  const withTk = wlRows.filter(r => r.tickers?.has_data).length
  const withTo = wlRows.filter(r => r.ticker_overview?.has_data).length
  const tt = wlRows[0]?.ticker_types

  return (
    <section className="space-y-3 rounded-md border p-4">
      <h3 className="text-sm font-semibold">Utilities</h3>
      <p className="text-sm text-muted-foreground">
        Reference tables <code className="text-xs">tickers</code>, <code className="text-xs">ticker_overview</code>, and{' '}
        <code className="text-xs">ticker_types</code> cover the full instrument universe (not watchlist-only).
      </p>
      <DenseDataTable tableClassName="text-xs">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-[10px] uppercase text-muted-foreground">
            <th className="px-3 py-2">Table</th>
            <th className="px-3 py-2">Coverage</th>
            <th className="px-3 py-2">Freshness</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="px-3 py-2 font-mono">tickers</td>
            <td className="px-3 py-2">
              {n > 0 ? `${withTk}/${n} symbols (watchlist slice)` : '—'}
            </td>
            <td className="px-3 py-2">—</td>
          </tr>
          <tr className="border-b">
            <td className="px-3 py-2 font-mono">ticker_overview</td>
            <td className="px-3 py-2">
              {n > 0 ? `${withTo}/${n} symbols` : '—'}
            </td>
            <td className="px-3 py-2">—</td>
          </tr>
          <tr>
            <td className="px-3 py-2 font-mono">ticker_types</td>
            <td className="px-3 py-2">
              {tt?.has_data && tt.dictionary_row_count != null
                ? `${tt.dictionary_row_count} dictionary rows`
                : '—'}
            </td>
            <td className="px-3 py-2">
              {tt?.has_data ? fmtTs(tt.dictionary_last_created_at ?? null) : '—'}
            </td>
          </tr>
        </tbody>
      </DenseDataTable>
    </section>
  )
}
