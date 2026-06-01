import { useCallback, useMemo, useState } from 'react'
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
import { CoveragePoolTable } from './CoveragePoolTable'
import sheetStyles from './InstanceStrategyPanel.module.css'
import './coverageSummaryLegacy.css'

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

  const hasInstances = instanceGroups.some((g) => g.strategy_instance_id != null)

  if (!hasInstances) {
    return (
      <div className="coverage-summary-section coverage-summary-section--placeholder">
        <h4 className={`${sheetStyles.subHeading} coverage-summary-heading-row`}>
          Coverage summary
          <InfoTooltip text={PLACEHOLDER_TOOLTIP} />
        </h4>
        <p className="coverage-summary-placeholder-text">
          This section is computed from the instance table above. With no instances matching the current
          filters, there is nothing to show here—so the pools are hidden, not missing. Clear or widen
          filters to bring instances back and see Option underlying / backing pools.
        </p>
      </div>
    )
  }

  return (
    <div className="coverage-summary-section">
      <div className="coverage-summary-intro">
        <h4 className={`${sheetStyles.subHeading} coverage-summary-heading-row`}>
          Coverage summary
          <InfoTooltip text={COVERAGE_TOOLTIP} />
        </h4>
      </div>
      <div className="coverage-pools-row">
        <div className="coverage-pool-panel">
          <p className="coverage-section-hint">Option underlying Pool</p>
          <p className="coverage-section-hint coverage-section-hint--sm">
            Long shares not needed for existing opportunity hedges (all scopes); can back additional
            options.
          </p>
          {optionUnderlyingPoolItems.length === 0 && (
            <p className="coverage-pool-empty-explanation">
              No rows when every long share is already counted toward instance hedges, or when your
              instances do not require separate underlying stock backup.
            </p>
          )}
          <p className="option-underlying-pool-totals">
            <span className="option-underlying-pool-total-item">
              <span className="option-underlying-pool-total-label">Market Total</span>{' '}
              <strong>{fmtUsd(marketTotal)}</strong>
            </span>
            <span className="option-underlying-pool-total-sep" aria-hidden>
              {' · '}
            </span>
            <span className="option-underlying-pool-total-item">
              {hostAccountId ? (
                <>
                  <strong className="coverage-account-id coverage-account-host">{hostAccountId}</strong>{' '}
                  <span className="option-underlying-pool-cash-bp" title="Total cash / buying power">
                    {fmtUsd(hostSecondaryCashBp.host.cash)}
                    {' / '}
                    {fmtUsd(hostSecondaryCashBp.host.bp)}
                  </span>
                </>
              ) : (
                <strong className="replay-muted">—</strong>
              )}
            </span>
            <span className="option-underlying-pool-total-sep" aria-hidden>
              {' · '}
            </span>
            <span className="option-underlying-pool-total-item">
              {secondaryAccountId ? (
                <>
                  <strong className="coverage-account-id coverage-account-secondary">
                    {secondaryAccountId}
                  </strong>{' '}
                  <span className="option-underlying-pool-cash-bp" title="Total cash / buying power">
                    {fmtUsd(hostSecondaryCashBp.secondary.cash)}
                    {' / '}
                    {fmtUsd(hostSecondaryCashBp.secondary.bp)}
                  </span>
                </>
              ) : (
                <strong className="replay-muted">—</strong>
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
          <div className="coverage-pool-panel">
            <p className="coverage-section-hint">Option backing Pool</p>
            <p className="coverage-section-hint coverage-section-hint--sm">
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
  )
}
