import { useMemo } from 'react'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
} from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import type { WatchlistDbCoverageSymbolRow } from '@/types/watchlistDbCoverage'
import {
  buildStocksUtilitiesSummaryRows,
  buildWatchlistBarsSummaryRows,
  buildWatchlistOptionsSummaryRows,
} from '@/utils/dataOverview/buildWatchlistSummaryRows'

function SummaryTable({ rows, freshnessTooltip }: { rows: ReturnType<typeof buildWatchlistOptionsSummaryRows>; freshnessTooltip: string }) {
  if (rows.length === 0) return null
  return (
    <DenseDataTable tableClassName="min-w-[640px]">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Table</DenseTableHead>
          <DenseTableHead>Pipeline</DenseTableHead>
          <DenseTableHead>Coverage</DenseTableHead>
          <DenseTableHead>
            <span className="inline-flex items-center gap-1">
              Freshness
              <InfoTooltip text={freshnessTooltip} />
            </span>
          </DenseTableHead>
          <DenseTableHead>Health</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map(row => (
          <DenseTableRow key={row.table}>
            <DenseTableCell>
              <code className="text-xs">{row.table}</code>
            </DenseTableCell>
            <DenseTableCell className={denseTable.mutedMeta}>{row.pipeline}</DenseTableCell>
            <DenseTableCell className={denseTable.mutedMeta}>{row.coverage}</DenseTableCell>
            <DenseTableCell className={denseTable.mutedMeta}>{row.freshness}</DenseTableCell>
            <DenseTableCell className={denseTable.mutedMeta}>{row.health}</DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}

const FRESHNESS_TOOLTIP =
  'Worst-case age across watchlist symbols for this table. option_contracts uses server age_seconds; others use parsed timestamps from the API.'

export function DataOverviewWatchlistOptionsSummaryTable({
  wlRows,
}: {
  wlRows: WatchlistDbCoverageSymbolRow[]
}) {
  const summaryRows = useMemo(() => buildWatchlistOptionsSummaryRows(wlRows), [wlRows])
  return <SummaryTable rows={summaryRows} freshnessTooltip={FRESHNESS_TOOLTIP} />
}

const BARS_FRESHNESS_TOOLTIP =
  'Worst-case age across watchlist symbols for the latest bar or row activity.'

const UTILITIES_FRESHNESS_TOOLTIP =
  'Worst-case age across watchlist symbols where applicable; ticker_types uses the global dictionary max(created_at).'

export function DataOverviewWatchlistStocksSummaryTable({
  wlRows,
}: {
  wlRows: WatchlistDbCoverageSymbolRow[]
}) {
  const barRows = useMemo(() => buildWatchlistBarsSummaryRows(wlRows), [wlRows])
  const utilRows = useMemo(() => buildStocksUtilitiesSummaryRows(wlRows), [wlRows])
  return (
    <div className="space-y-4">
      <div>
        <h5 className="mb-2 inline-flex items-center gap-1 text-sm font-medium">
          Watchlist bars
          <InfoTooltip text="Per-watchlist-symbol OHLC coverage (stock_day, stock_min)." />
        </h5>
        <SummaryTable rows={barRows} freshnessTooltip={BARS_FRESHNESS_TOOLTIP} />
      </div>
      <div>
        <h5 className="mb-2 inline-flex items-center gap-1 text-sm font-medium">
          Utilities
          <InfoTooltip text="PostgreSQL reference tables for the full Massive instruments universe. Coverage uses the watchlist as a convenience slice where rows are per-symbol; ticker_types is one global dictionary." />
        </h5>
        <p className="mb-2 text-xs text-muted-foreground">
          Not watchlist-specific — universe-wide reference data. Slice columns show how many watchlist symbols
          have rows where applicable.
        </p>
        <SummaryTable rows={utilRows} freshnessTooltip={UTILITIES_FRESHNESS_TOOLTIP} />
      </div>
    </div>
  )
}
