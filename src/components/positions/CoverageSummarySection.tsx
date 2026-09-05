import { useCallback, useMemo, useState } from 'react'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
} from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { accountTotalCashBuyingPower } from '@/utils/accountSnapshot'
import {
  type CoveragePoolSortCol,
  buildOptionUnderlyingPoolItems,
  buildWatchlistBackingCoverageItems,
  sortStockCoverageItemsByColumn,
  underlyingPoolMarketTotal,
} from '@/utils/coveragePool'
import { fmtUsd } from '@/utils/positions'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { InstanceAllGroup, StockCoverageItem } from '@/types/positions'
import type { ExposureSummary } from '@/utils/assignmentExposure'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  GrandTotalRow,
  denseTableNumCell,
} from '@/components/data-display'
import { CoveragePoolTable } from './CoveragePoolTable'
import { instancePanel } from './instancePanelClasses'
import { coveragePanel } from './coveragePanelClasses'
import { cn } from '@/lib/utils'

const COVERAGE_TOOLTIP =
  'The Account filter in the top composition row applies here too. Optionable symbols only; Independent Holdings are not listed in pools. Underlying pool = stock left after opportunity hedges.'

const PLACEHOLDER_TOOLTIP =
  'Option underlying pool and backing pool tables appear when instances match filters. Underlying pool = stock left after opportunity hedges.'

interface Props {
  /** All instance groups (unfiltered) — section visibility uses this count. */
  instanceGroups: InstanceAllGroup[]
  stockCoverageItems: StockCoverageItem[]
  chartAccountId: string
  hostAccountId: string
  secondaryAccountId: string
  accounts: IbAccountSnapshot[]
  onInspectSymbol?: (symbol: string, accountId: string) => void
  /** Controlled by the page so an alarm chip can open it. */
  open: boolean
  onToggle: () => void
  /** What the book owes if every short option is assigned. */
  exposure: ExposureSummary
  /** Assignment cash / buying power. Null when buying power is unknown. */
  coverRatio: number | null
}

function AssignmentExposureTable({
  exposure,
  coverRatio,
}: {
  exposure: ExposureSummary
  coverRatio: number | null
}) {
  if (exposure.bySymbol.length === 0) {
    return <p className={coveragePanel.poolEmptyExplanation}>No short options open.</p>
  }
  return (
    <DenseDataTable tableClassName="min-w-[20rem]">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Symbol</DenseTableHead>
          <DenseTableHead align="right" title="Short put contracts.">
            P
          </DenseTableHead>
          <DenseTableHead align="right" title="Cash required if every short put is assigned.">
            Cash if assigned
          </DenseTableHead>
          <DenseTableHead align="right" title="Short calls with stock behind them.">
            Cov C
          </DenseTableHead>
          <DenseTableHead title="Short calls with no stock behind them — unbounded, so no dollar figure.">
            Naked C
          </DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {exposure.bySymbol.map((row) => (
          <DenseTableRow key={row.underlying} className="[&_td]:whitespace-nowrap [&_td]:text-dense-body">
            <DenseTableCell className="font-mono text-xs font-semibold">
              {row.underlying}
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
              {row.shortPutContracts || '—'}
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
              {row.putAssignmentCash > 0 ? fmtUsd(row.putAssignmentCash) : '—'}
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
              {row.coveredCallContracts || '—'}
            </DenseTableCell>
            <DenseTableCell className="text-xs">
              {row.nakedCallContracts > 0 ? (
                <DenseTag variant="danger" size="cell">
                  {row.nakedCallContracts}
                </DenseTag>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DenseTableCell>
          </DenseTableRow>
        ))}
        <GrandTotalRow labelColSpan={2} label={`Total (${exposure.bySymbol.length})`}>
          <DenseTableCell className={cn(denseTableNumCell, 'text-xs font-semibold')}>
            {fmtUsd(exposure.putAssignmentCash)}
            {coverRatio != null ? (
              <div
                className={cn(
                  'text-dense-caption',
                  coverRatio >= 1 ? 'text-loss' : coverRatio >= 0.5 ? 'text-warning' : 'text-muted-foreground',
                )}
              >
                {(coverRatio * 100).toFixed(0)}% of BP
              </div>
            ) : null}
          </DenseTableCell>
          <DenseTableCell className={cn(denseTableNumCell, 'text-xs font-semibold')}>
            {exposure.coveredCallContracts || '—'}
          </DenseTableCell>
          <DenseTableCell className="text-xs">
            {exposure.nakedCallContracts > 0 ? (
              <DenseTag variant="danger" size="cell">
                {exposure.nakedCallContracts}
              </DenseTag>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </DenseTableCell>
        </GrandTotalRow>
      </DenseTableBody>
    </DenseDataTable>
  )
}

function filterByChartAccount(items: StockCoverageItem[], chartAccountId: string): StockCoverageItem[] {
  if (chartAccountId === 'all') return items
  return items.filter((ci) => (ci.account_id ?? '').trim() === chartAccountId)
}

export function CoverageSummarySection({
  instanceGroups,
  stockCoverageItems,
  chartAccountId,
  hostAccountId,
  secondaryAccountId,
  accounts,
  onInspectSymbol,
  open,
  onToggle,
  exposure,
  coverRatio,
}: Props) {

  const [underlyingPoolSort, setUnderlyingPoolSort] = useState<{
    col: CoveragePoolSortCol
    dir: 'asc' | 'desc'
  }>({ col: 'market_price', dir: 'desc' })

  const [backingPoolSort, setBackingPoolSort] = useState<{
    col: CoveragePoolSortCol
    dir: 'asc' | 'desc'
  }>({ col: 'market_price', dir: 'desc' })

  const optionUnderlyingPoolItems = useMemo(
    () => buildOptionUnderlyingPoolItems(stockCoverageItems),
    [stockCoverageItems],
  )

  const watchlistBackingItems = useMemo(
    () => buildWatchlistBackingCoverageItems(stockCoverageItems),
    [stockCoverageItems],
  )

  const sortedUnderlying = useMemo(
    () =>
      sortStockCoverageItemsByColumn(
        optionUnderlyingPoolItems,
        underlyingPoolSort.col,
        underlyingPoolSort.dir,
      ),
    [optionUnderlyingPoolItems, underlyingPoolSort],
  )

  const sortedBacking = useMemo(
    () =>
      sortStockCoverageItemsByColumn(
        watchlistBackingItems,
        backingPoolSort.col,
        backingPoolSort.dir,
      ),
    [watchlistBackingItems, backingPoolSort],
  )

  const underlyingForSection = useMemo(
    () => filterByChartAccount(sortedUnderlying, chartAccountId),
    [sortedUnderlying, chartAccountId],
  )

  const backingForSection = useMemo(
    () => filterByChartAccount(sortedBacking, chartAccountId),
    [sortedBacking, chartAccountId],
  )

  const marketTotal = useMemo(
    () => underlyingPoolMarketTotal(optionUnderlyingPoolItems, chartAccountId),
    [optionUnderlyingPoolItems, chartAccountId],
  )

  const hostSecondaryCashBp = useMemo(() => {
    const snap = (id: string) =>
      id ? accounts.find((a) => (a.account_id ?? '').trim() === id) : undefined
    return {
      host: accountTotalCashBuyingPower(snap(hostAccountId)),
      secondary: accountTotalCashBuyingPower(snap(secondaryAccountId)),
    }
  }, [accounts, hostAccountId, secondaryAccountId])

  const onUnderlyingPoolSortClick = useCallback((col: CoveragePoolSortCol) => {
    setUnderlyingPoolSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' },
    )
  }, [])

  const onBackingPoolSortClick = useCallback((col: CoveragePoolSortCol) => {
    setBackingPoolSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' },
    )
  }, [])

  // The pool exists to answer "how many more can I sell". Collapsing it without
  // that number would hide the only reason to open it.
  const availableContracts = useMemo(
    () =>
      underlyingForSection.reduce(
        (n, ci) => n + Math.floor(Math.max(0, ci.held_shares) / 100),
        0,
      ),
    [underlyingForSection],
  )

  const hasInstances = instanceGroups.some((g) => g.strategy_instance_id != null)

  if (!hasInstances) {
    return (
      <div className={coveragePanel.summarySection}>
        <h4 className={cn(instancePanel.subHeading, coveragePanel.headingRow)}>
          Coverage summary
          <InfoTooltip text={PLACEHOLDER_TOOLTIP} />
        </h4>
        <p className={coveragePanel.placeholderText}>
          This section is computed from the instance table above. With no instances matching the current
          filters, there is nothing to show here—so the pools are hidden, not missing. Clear or widen
          filters to bring instances back and see Option underlying / backing pools.
        </p>
      </div>
    )
  }

  return (
    <CollapsibleGroup>
      <CollapsibleGroupHeader expanded={open} onToggle={onToggle}>
        <CollapsibleChevron expanded={open} />
        <CollapsibleGroupTitle>
          <span className={coveragePanel.headingRow}>
            Coverage summary
            <InfoTooltip text={COVERAGE_TOOLTIP} />
          </span>
        </CollapsibleGroupTitle>
        <CollapsibleGroupStats>
          <span className="text-xs text-muted-foreground">
            {/* Demand first: what the book owes is the reason to look at what backs it. */}
            <span title="Cash to take assignment on every short put.">
              if assigned{' '}
              <strong className="text-foreground">{fmtUsd(exposure.putAssignmentCash)}</strong>
              {coverRatio != null ? (
                <span className={coverRatio >= 1 ? 'text-loss' : coverRatio >= 0.5 ? 'text-warning' : undefined}>
                  {' '}
                  ({(coverRatio * 100).toFixed(0)}% of BP)
                </span>
              ) : null}
            </span>
            {' · '}
            <strong className="text-foreground">{availableContracts}</strong> more contracts backable
            {' · '}
            {fmtUsd(marketTotal)} free stock
            {hostAccountId ? (
              <>
                {' · '}
                <span className={cn(coveragePanel.accountId, coveragePanel.accountHost)}>
                  {hostAccountId}
                </span>{' '}
                <span className={coveragePanel.cashBp} title="Total cash / buying power">
                  {fmtUsd(hostSecondaryCashBp.host.cash)} / {fmtUsd(hostSecondaryCashBp.host.bp)}
                </span>
              </>
            ) : null}
            {secondaryAccountId ? (
              <>
                {' · '}
                <span className={cn(coveragePanel.accountId, coveragePanel.accountSecondary)}>
                  {secondaryAccountId}
                </span>{' '}
                <span className={coveragePanel.cashBp} title="Total cash / buying power">
                  {fmtUsd(hostSecondaryCashBp.secondary.cash)} /{' '}
                  {fmtUsd(hostSecondaryCashBp.secondary.bp)}
                </span>
              </>
            ) : null}
          </span>
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {!open ? null : (
      <CollapsibleGroupBody>
    <div className={coveragePanel.summarySection}>
      <div className={coveragePanel.poolsRow}>
        <div className={coveragePanel.poolPanel}>
          <p className={coveragePanel.sectionHint}>If assigned</p>
          <p className={cn(coveragePanel.sectionHint, coveragePanel.sectionHintSm)}>
            What every short option would demand at once. Short puts cost cash; short calls
            cost shares, and the ones with no shares behind them are unbounded — so they are
            counted, never priced.
          </p>
          <AssignmentExposureTable exposure={exposure} coverRatio={coverRatio} />
        </div>
        <div className={coveragePanel.poolPanel}>
          <p className={coveragePanel.sectionHint}>Option underlying Pool</p>
          <p className={cn(coveragePanel.sectionHint, coveragePanel.sectionHintSm)}>
            Long shares not needed for existing opportunity hedges (all scopes); can back additional
            options.
          </p>
          {optionUnderlyingPoolItems.length === 0 && (
            <p className={coveragePanel.poolEmptyExplanation}>
              No rows when every long share is already counted toward instance hedges, or when your
              instances do not require separate underlying stock backup.
            </p>
          )}
          <p className={coveragePanel.totalsLine}>
            <span className={coveragePanel.totalItem}>
              <span className={coveragePanel.totalLabel}>Market Total</span>{' '}
              <strong>{fmtUsd(marketTotal)}</strong>
            </span>
            <span className={coveragePanel.totalSep} aria-hidden>
              {' · '}
            </span>
            <span className={coveragePanel.totalItem}>
              {hostAccountId ? (
                <>
                  <strong className={cn(coveragePanel.accountId, coveragePanel.accountHost)}>
                    {hostAccountId}
                  </strong>{' '}
                  <span className={coveragePanel.cashBp} title="Total cash / buying power">
                    {fmtUsd(hostSecondaryCashBp.host.cash)}
                    {' / '}
                    {fmtUsd(hostSecondaryCashBp.host.bp)}
                  </span>
                </>
              ) : (
                <strong className="text-muted-foreground">—</strong>
              )}
            </span>
            <span className={coveragePanel.totalSep} aria-hidden>
              {' · '}
            </span>
            <span className={coveragePanel.totalItem}>
              {secondaryAccountId ? (
                <>
                  <strong className={cn(coveragePanel.accountId, coveragePanel.accountSecondary)}>
                    {secondaryAccountId}
                  </strong>{' '}
                  <span className={coveragePanel.cashBp} title="Total cash / buying power">
                    {fmtUsd(hostSecondaryCashBp.secondary.cash)}
                    {' / '}
                    {fmtUsd(hostSecondaryCashBp.secondary.bp)}
                  </span>
                </>
              ) : (
                <strong className="text-muted-foreground">—</strong>
              )}
            </span>
          </p>
          <CoveragePoolTable
            rows={underlyingForSection}
            keyPrefix="underlying-pool"
            underlyingPoolSlim
            hostAccountId={hostAccountId}
            secondaryAccountId={secondaryAccountId}
            underlyingPoolSort={{
              column: underlyingPoolSort.col,
              dir: underlyingPoolSort.dir,
              onColumnClick: onUnderlyingPoolSortClick,
            }}
            onInspectSymbol={
              onInspectSymbol
                ? (ci) => onInspectSymbol(ci.symbol, ci.account_id)
                : undefined
            }
          />
        </div>

        {watchlistBackingItems.length > 0 && (
          <div className={coveragePanel.poolPanel}>
            <p className={coveragePanel.sectionHint}>Option backing Pool</p>
            <p className={cn(coveragePanel.sectionHint, coveragePanel.sectionHintSm)}>
              Watchlist-scoped opportunities: Required = hedge from those strategies only.
            </p>
            <CoveragePoolTable
              rows={backingForSection}
              keyPrefix="watchlist-optionable"
              backingPoolSlim
              hostAccountId={hostAccountId}
              secondaryAccountId={secondaryAccountId}
              underlyingPoolSort={{
                column: backingPoolSort.col,
                dir: backingPoolSort.dir,
                onColumnClick: onBackingPoolSortClick,
              }}
              onInspectSymbol={
                onInspectSymbol
                  ? (ci) => onInspectSymbol(ci.symbol, ci.account_id)
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
      </CollapsibleGroupBody>
      )}
    </CollapsibleGroup>
  )
}
