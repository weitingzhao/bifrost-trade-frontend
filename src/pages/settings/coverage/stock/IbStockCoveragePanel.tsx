import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { ReferenceIndexSymbolCell } from '@/components/massive/ReferenceIndexSymbolCell'
import type { BarCoverageItem, BarsCoverageResponse } from '@/types/barsCoverage'
import type { StatusResponse } from '@/types/monitor'
import {
  coverageCell,
  coverageCompact,
  coverageRange,
  coverageStatusDisplay,
} from '@/utils/massive/barCoverageDisplay'
import { normCoverageSymbol } from '@/utils/massive/coverageSymbolGroups'

export interface IbStockCoveragePanelProps {
  coverage: BarCoverageItem[] | null
  coveragePolicy: BarsCoverageResponse['policy'] | null
  coverageLoading: boolean
  coverageError: string | null
  deleteSymbolError: string | null
  deletingSymbol: string | null
  backfillSymbol: string | null
  backfillMessage: string | null
  isTradingDay: boolean | null
  status: StatusResponse | null | undefined
  coverageGroups: { label: string; rows: BarCoverageItem[] }[]
  indicesRefreshLoading: boolean
  indicesRefreshMessage: string | null
  watchlistRefreshMessage: string | null
  watchlistPreviewLoading: boolean
  watchlistRefreshRunning: boolean
  backfillIsTest: boolean
  needWatchlistDryRun: boolean
  backfillApiIntervalSec: number
  onLoadCoverage: () => void
  onRefreshIndices: () => void
  onWatchlistEodRefresh: () => void
  onOpenReset: (symbol: string, isIndex: boolean) => void
  onOpenPull: (symbol: string, isIndex: boolean) => void
  onBackfillIsTestChange: (value: boolean) => void
  onNeedWatchlistDryRunChange: (value: boolean) => void
  onBackfillApiIntervalSecChange: (value: number) => void
}

const emptyPeriod = { count: 0, min_ts: null, max_ts: null }

export function IbStockCoveragePanel({
  coverage,
  coveragePolicy,
  coverageLoading,
  coverageError,
  deleteSymbolError,
  deletingSymbol,
  backfillSymbol,
  backfillMessage,
  isTradingDay,
  status,
  coverageGroups,
  indicesRefreshLoading,
  indicesRefreshMessage,
  watchlistRefreshMessage,
  watchlistPreviewLoading,
  watchlistRefreshRunning,
  backfillIsTest,
  needWatchlistDryRun,
  backfillApiIntervalSec,
  onLoadCoverage,
  onRefreshIndices,
  onWatchlistEodRefresh,
  onOpenReset,
  onOpenPull,
  onBackfillIsTestChange,
  onNeedWatchlistDryRunChange,
  onBackfillApiIntervalSecChange,
}: IbStockCoveragePanelProps) {
  const policyHint = coveragePolicy
    ? `Daily ${coveragePolicy.daily_years}y, 1 min ${coveragePolicy.min_weeks}w, 5min ${coveragePolicy['5min_months']}mo, 1h ${coveragePolicy['1hour_months']}mo.`
    : 'Target range from config: Daily 10y, 1 min 1w, 5min 1mo, 1h 3mo.'

  return (
    <section className="space-y-4" aria-labelledby="data-coverage-head">
      <h3 id="data-coverage-head" className="text-base font-medium inline-flex items-center gap-1">
        Coverage
        <InfoTooltip
          text={`Coverage of Watchlist stocks in stock_day / stock_min by period. ${policyHint} Need backfill if status is not OK.`}
        />
      </h3>

      <div className="flex flex-wrap items-center gap-4 rounded-md border bg-secondary/30 p-3">
        <div className="flex items-center gap-2">
          <Switch id="fake-ib" checked={backfillIsTest} onCheckedChange={onBackfillIsTestChange} />
          <Label htmlFor="fake-ib" className="text-sm">
            fake IB call
          </Label>
          <InfoTooltip text="When on, pull will not call IB (test mode). Default off." />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="dry-run" checked={needWatchlistDryRun} onCheckedChange={onNeedWatchlistDryRunChange} />
          <Label htmlFor="dry-run" className="text-sm">
            Dry run
          </Label>
          <InfoTooltip text="When on, EOD Pull opens preview before queueing jobs." />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="api-interval" className="text-sm whitespace-nowrap">
            API interval (sec)
          </Label>
          <Input
            id="api-interval"
            type="number"
            min={0}
            max={300}
            className="h-8 w-16"
            value={backfillApiIntervalSec}
            onChange={e =>
              onBackfillApiIntervalSecChange(Math.max(0, Math.min(300, parseInt(e.target.value, 10) || 0)))
            }
          />
        </div>
        <Button type="button" variant="outline" size="sm" disabled={coverageLoading} onClick={() => onLoadCoverage()}>
          {coverageLoading ? '…' : 'Refresh coverage'}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={watchlistPreviewLoading || watchlistRefreshRunning}
          onClick={() => void onWatchlistEodRefresh()}
        >
          {watchlistPreviewLoading ? 'Dry run…' : watchlistRefreshRunning ? 'Queuing…' : 'Pull EOD'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={indicesRefreshLoading || (status?.live_ui?.reference_indices?.length ?? 0) === 0}
          onClick={() => void onRefreshIndices()}
        >
          {indicesRefreshLoading ? 'Refreshing…' : 'Refresh Index'}
        </Button>
      </div>

      {indicesRefreshMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {indicesRefreshMessage}
        </p>
      ) : null}
      {watchlistRefreshMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {watchlistRefreshMessage}
        </p>
      ) : null}
      {coverageError ? (
        <p className="text-sm text-destructive" role="alert">
          {coverageError}
        </p>
      ) : null}
      {deleteSymbolError ? (
        <p className="text-sm text-destructive" role="alert">
          {deleteSymbolError}
        </p>
      ) : null}
      {backfillMessage && backfillSymbol ? (
        <p className="text-sm text-muted-foreground" role="status">
          {backfillSymbol}: {backfillMessage}
        </p>
      ) : null}

      {coverage && coverage.length === 0 && !coverageLoading ? (
        <p className="text-sm text-muted-foreground">
          No stocks in Watchlist and no reference indices configured. Add stocks on the Watchlist tab or configure
          reference_indices, then refresh.
        </p>
      ) : null}

      {coverage && coverage.length > 0 ? (
        <DenseDataTable tableClassName="min-w-[900px]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead rowSpan={2}>Symbol</DenseTableHead>
              <DenseTableHead colSpan={2}>Daily</DenseTableHead>
              <DenseTableHead colSpan={2}>1 min</DenseTableHead>
              <DenseTableHead colSpan={2}>5 mins</DenseTableHead>
              <DenseTableHead colSpan={2}>1 hour</DenseTableHead>
              <DenseTableHead rowSpan={2}>Actions</DenseTableHead>
            </DenseTableHeadRow>
            <DenseTableHeadRow>
              <DenseTableHead>Bars</DenseTableHead>
              <DenseTableHead>Range</DenseTableHead>
              <DenseTableHead>Bars</DenseTableHead>
              <DenseTableHead>Range</DenseTableHead>
              <DenseTableHead>Bars</DenseTableHead>
              <DenseTableHead>Range</DenseTableHead>
              <DenseTableHead>Bars</DenseTableHead>
              <DenseTableHead>Range</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {coverageGroups.map(group => (
              <Fragment key={group.label || 'all'}>
                {group.label ? (
                  <DenseTableRow>
                    <DenseTableCell colSpan={10} className="bg-muted/30 text-xs font-semibold uppercase">
                      {group.label}
                    </DenseTableCell>
                  </DenseTableRow>
                ) : null}
                {group.rows.map(row => {
                  const isIndex = status?.live_ui?.reference_indices?.some(
                    r => normCoverageSymbol(r.symbol) === normCoverageSymbol(row.symbol),
                  )
                  const daySt = coverageStatusDisplay(row.stock_day?.status)
                  const min1St = coverageStatusDisplay(row.stock_min['1 min']?.status)
                  const min5St = coverageStatusDisplay(row.stock_min['5 mins']?.status)
                  const min1hSt = coverageStatusDisplay(row.stock_min['1 hour']?.status)
                  const isDeleting = deletingSymbol === row.symbol
                  const periodsNeedingBackfill: string[] = []
                  if (daySt.needBackfill) periodsNeedingBackfill.push('1 D')
                  if (min1St.needBackfill) periodsNeedingBackfill.push('1 min')
                  if (min5St.needBackfill) periodsNeedingBackfill.push('5 mins')
                  if (min1hSt.needBackfill) periodsNeedingBackfill.push('1 hour')
                  const isBackfilling = backfillSymbol === row.symbol
                  const canBackfill =
                    periodsNeedingBackfill.length > 0 && !isBackfilling && !isDeleting && !isIndex
                  const ref = status?.live_ui?.reference_indices?.find(
                    r => r.symbol.trim().toUpperCase() === row.symbol.trim().toUpperCase(),
                  )
                  const renderBars = (p: typeof row.stock_day, needPull: boolean) => (
                    <span className={denseTableNumCell}>
                      {coverageCompact(p, needPull, isTradingDay)}
                    </span>
                  )
                  return (
                    <DenseTableRow key={row.symbol}>
                      <DenseTableCell>
                        {isIndex && ref ? (
                          <ReferenceIndexSymbolCell symbol={row.symbol} reference={ref} />
                        ) : (
                          <span className="font-medium">{row.symbol}</span>
                        )}
                      </DenseTableCell>
                      <DenseTableCell className={denseTable.mutedMeta} title={coverageCell(row.stock_day, { dailySessionDates: true })}>
                        {renderBars(row.stock_day, daySt.needBackfill)}
                      </DenseTableCell>
                      <DenseTableCell className={`${denseTable.mutedMeta} whitespace-pre-line text-xs`}>
                        {coverageRange(row.stock_day, { dailySessionDates: true })}
                      </DenseTableCell>
                      <DenseTableCell className={denseTable.mutedMeta}>
                        {renderBars(row.stock_min['1 min'] || emptyPeriod, min1St.needBackfill)}
                      </DenseTableCell>
                      <DenseTableCell className={`${denseTable.mutedMeta} whitespace-pre-line text-xs`}>
                        {coverageRange(row.stock_min['1 min'] || emptyPeriod)}
                      </DenseTableCell>
                      <DenseTableCell className={denseTable.mutedMeta}>
                        {renderBars(row.stock_min['5 mins'] || emptyPeriod, min5St.needBackfill)}
                      </DenseTableCell>
                      <DenseTableCell className={`${denseTable.mutedMeta} whitespace-pre-line text-xs`}>
                        {coverageRange(row.stock_min['5 mins'] || emptyPeriod)}
                      </DenseTableCell>
                      <DenseTableCell className={denseTable.mutedMeta}>
                        {renderBars(row.stock_min['1 hour'] || emptyPeriod, min1hSt.needBackfill)}
                      </DenseTableCell>
                      <DenseTableCell className={`${denseTable.mutedMeta} whitespace-pre-line text-xs`}>
                        {coverageRange(row.stock_min['1 hour'] || emptyPeriod)}
                      </DenseTableCell>
                      <DenseTableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isDeleting}
                            onClick={() => onOpenReset(row.symbol, Boolean(isIndex))}
                          >
                            {isDeleting ? '…' : 'Reset'}
                          </Button>
                          {isIndex ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={indicesRefreshLoading || isBackfilling}
                              onClick={() => onOpenPull(row.symbol, true)}
                            >
                              {isBackfilling ? backfillMessage || 'Pulling…' : 'Pull'}
                            </Button>
                          ) : periodsNeedingBackfill.length > 0 ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={!canBackfill}
                              onClick={() => onOpenPull(row.symbol, false)}
                            >
                              {isBackfilling ? backfillMessage || 'Queuing…' : 'Pull'}
                            </Button>
                          ) : null}
                        </div>
                      </DenseTableCell>
                    </DenseTableRow>
                  )
                })}
              </Fragment>
            ))}
          </DenseTableBody>
        </DenseDataTable>
      ) : null}
    </section>
  )
}
