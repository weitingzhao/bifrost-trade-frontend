import { Fragment } from 'react'
import type { DailyBenchmark, QuoteItem } from '@/types/market'
import { cn } from '@/lib/utils'
import {
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  GrandTotalRow,
  GroupHeaderRow,
  InlinePnl,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import type { MarketStreamsRow, OptPositionRow } from '@/utils/marketStreamsRows'
import type { LiveSortGroup, MarketStreamsSortMode } from '@/utils/marketStreamsSort'
import {
  marketStreamsSortHeaderAccentClass,
  marketStreamsSortHeaderMeta,
} from '@/utils/marketStreamsSort'
import type { OptionLiveBasis } from '@/utils/optionLiveBasis'
import {
  resolveStkAccountMetrics,
  sumStkCostBasis,
  sumStkDailyDollar,
  type StreamAccountViewMode,
  type OptPremiumUnit,
} from '@/utils/streamAccountView'
import { AccountMetricCells } from './AccountMetricCells'
import { AccountDailyCells } from './AccountDailyCells'
import { AccountSinceCells } from './AccountSinceCells'
import { MarketStreamStkRow } from './MarketStreamStkRow'
import { MarketStreamOptRow } from './MarketStreamOptRow'
import { liveTable } from './liveTableClasses'
import styles from './live.module.css'
import { liveEmptyHintClass } from './liveUi'

/** Symbol + Qty + Cost + Last + Daily $ + Daily % + Since $ + Since % */
function marketStreamsColSpan(_hasStreamAccounts: boolean): number {
  return 8
}

interface Props {
  hasStreamAccounts: boolean
  accountViewMode: StreamAccountViewMode
  optPremiumUnit: OptPremiumUnit
  msSortMode: MarketStreamsSortMode
  onCycleSort: () => void
  dragEnabled: boolean
  categoryOrderFiltered: string[]
  sortedRowsByCategory: Record<string, MarketStreamsRow[]>
  sortedOptRows: OptPositionRow[]
  unifiedGroupedRows: LiveSortGroup[] | null
  filteredRows: MarketStreamsRow[]
  optPositionRows: OptPositionRow[]
  marketStreamsDailyTotals: { totalDailyDollar: number; totalDailyPct: number | null }
  quotesByContractKey: Record<string, QuoteItem>
  benchmarks: Record<string, DailyBenchmark>
  optionLiveBasisByRow: Map<string, OptionLiveBasis>
  streamHostId: string | null
  streamSecondaryId: string | null
  onSymbolReorder: (category: string, fromSymbol: string, toSymbol: string) => void
  onOptRowReorder: (fromBasisKey: string, toBasisKey: string) => void
}

function SortHeaderButton({
  mode,
  onCycleSort,
}: {
  mode: MarketStreamsSortMode
  onCycleSort: () => void
}) {
  const meta = marketStreamsSortHeaderMeta(mode)
  const accent = marketStreamsSortHeaderAccentClass(mode)
  const accentClass =
    accent === 'alpha'
      ? styles.sortHeaderAlpha
      : accent === 'type'
        ? styles.sortHeaderType
        : accent === 'gamma'
          ? styles.sortHeaderGamma
          : accent === 'expiry'
            ? styles.sortHeaderExpiry
            : ''

  return (
    <button
      type="button"
      className={cn(styles.sortHeader, accentClass)}
      onClick={onCycleSort}
      title="Cycle sort: default → A–Z → Z–A → T+ modes → E+ by expiry"
    >
      Symbol
      {meta.suffix && <span className={styles.sortSuffix}>{meta.suffix}</span>}
      {meta.arrow === 'up' && <span className={styles.sortArrowUp} aria-hidden />}
      {meta.arrow === 'down' && <span className={styles.sortArrowDown} aria-hidden />}
    </button>
  )
}

export function MarketStreamsTable({
  hasStreamAccounts,
  accountViewMode,
  optPremiumUnit,
  msSortMode,
  onCycleSort,
  dragEnabled,
  categoryOrderFiltered,
  sortedRowsByCategory,
  sortedOptRows,
  unifiedGroupedRows,
  filteredRows,
  optPositionRows,
  marketStreamsDailyTotals,
  quotesByContractKey,
  benchmarks,
  optionLiveBasisByRow,
  streamHostId,
  streamSecondaryId,
  onSymbolReorder,
  onOptRowReorder,
}: Props) {
  const msColSpan = marketStreamsColSpan(hasStreamAccounts)
  const viewMode = hasStreamAccounts ? accountViewMode : 'combine'
  const { costSum, pnlSum } = sumStkCostBasis(filteredRows, viewMode)
  const totalPct = costSum > 0 && Number.isFinite(pnlSum) ? (pnlSum / costSum) * 100 : null
  const { totalDailyPct } = marketStreamsDailyTotals
  const totalDailyDollar = sumStkDailyDollar(filteredRows, viewMode)

  const totalDailyMetrics = (() => {
    if (hasStreamAccounts && accountViewMode === 'all') {
      let hostD = 0
      let secD = 0
      for (const r of filteredRows) {
        if (r.hostPnlVsBench != null && Number.isFinite(r.hostPnlVsBench)) hostD += r.hostPnlVsBench
        if (r.secondaryPnlVsBench != null && Number.isFinite(r.secondaryPnlVsBench)) {
          secD += r.secondaryPnlVsBench
        }
      }
      return {
        kind: 'split' as const,
        hostPct: totalDailyPct,
        hostDollar: hostD !== 0 ? hostD : null,
        secondaryPct: totalDailyPct,
        secondaryDollar: secD !== 0 ? secD : null,
      }
    }
    return {
      kind: 'single' as const,
      pct: totalDailyPct,
      dollar: totalDailyDollar !== 0 ? totalDailyDollar : null,
    }
  })()

  const showTotalRow =
    (filteredRows.length > 0 || optPositionRows.length > 0) && filteredRows.length > 0

  const totalAccountMetrics = (() => {
    if (!hasStreamAccounts) return null
    if (accountViewMode === 'all') {
      let hostCost = 0
      let hostPnl = 0
      let secCost = 0
      let secPnl = 0
      for (const r of filteredRows) {
        const m = resolveStkAccountMetrics(r, 'all')
        if (m.kind !== 'split') continue
        const hq = m.hostQty != null && Number.isFinite(m.hostQty) ? m.hostQty : 0
        const hc = m.hostAvgCost != null && Number.isFinite(m.hostAvgCost) ? m.hostAvgCost : 0
        const sq = m.secondaryQty != null && Number.isFinite(m.secondaryQty) ? m.secondaryQty : 0
        const sc =
          m.secondaryAvgCost != null && Number.isFinite(m.secondaryAvgCost) ? m.secondaryAvgCost : 0
        hostCost += hq * hc
        secCost += sq * sc
        if (m.hostPnl != null && Number.isFinite(m.hostPnl)) hostPnl += m.hostPnl
        if (m.secondaryPnl != null && Number.isFinite(m.secondaryPnl)) secPnl += m.secondaryPnl
      }
      return {
        kind: 'split' as const,
        hostQty: null,
        hostAvgCost: hostCost !== 0 ? hostCost : null,
        hostPnl: hostPnl !== 0 ? hostPnl : null,
        secondaryQty: null,
        secondaryAvgCost: secCost !== 0 ? secCost : null,
        secondaryPnl: secPnl !== 0 ? secPnl : null,
      }
    }
    return {
      kind: 'single' as const,
      qty: null,
      avgCost: costSum !== 0 ? costSum : null,
      pnl: pnlSum !== 0 ? pnlSum : null,
    }
  })()

  return (
    <div className={liveTable.shell}>
      <table className={liveTable.table}>
        <DenseTableHeader className={liveTable.stickyThead}>
          <DenseTableHeadRow>
            <DenseTableHead scope="col" className="normal-case">
              <SortHeaderButton mode={msSortMode} onCycleSort={onCycleSort} />
            </DenseTableHead>
            <DenseTableHead align="right">Qty</DenseTableHead>
            <DenseTableHead align="right">Cost</DenseTableHead>
            <DenseTableHead align="right" title="Last price; Bid and Ask shown as spread vs Last">
              Last (Bid / Ask)
            </DenseTableHead>
            <DenseTableHead align="right" title="Daily PnL $ vs prior close (account view)">
              Daily $
            </DenseTableHead>
            <DenseTableHead align="right" title="Daily price return % vs prior close">
              Daily %
            </DenseTableHead>
            <DenseTableHead align="right" title="Unrealized PnL vs cost (account view)">
              Since $
            </DenseTableHead>
            <DenseTableHead align="right" title="Unrealized return vs cost (account view)">
              Since %
            </DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {filteredRows.length === 0 && optPositionRows.length === 0 ? (
            <tr>
              <DenseTableCell colSpan={msColSpan} className={liveEmptyHintClass}>
                No market stream symbols
              </DenseTableCell>
            </tr>
          ) : unifiedGroupedRows ? (
            unifiedGroupedRows.map(g => (
              <Fragment key={g.label || 'flat'}>
                {g.showGroupHeader && g.label ? (
                  <GroupHeaderRow colSpan={msColSpan} label={g.label} variant="category" />
                ) : null}
                {g.stkRows.map(row => (
                  <MarketStreamStkRow
                    key={row.symbol}
                    row={row}
                    categoryForDrag={row.category}
                    dragEnabled={false}
                    hasStreamAccounts={hasStreamAccounts}
                    accountViewMode={accountViewMode}
                    benchmarks={benchmarks}
                  />
                ))}
                {g.optRows.map(row => (
                  <MarketStreamOptRow
                    key={optBasisKey(row)}
                    row={row}
                    quote={quotesByContractKey[row.contract_key]}
                    basis={optionLiveBasisByRow.get(optBasisKey(row))}
                    streamHostId={streamHostId}
                    streamSecondaryId={streamSecondaryId}
                    hasStreamAccounts={hasStreamAccounts}
                    accountViewMode={accountViewMode}
                    optPremiumUnit={optPremiumUnit}
                    dragEnabled={false}
                  />
                ))}
              </Fragment>
            ))
          ) : (
            <>
              {categoryOrderFiltered.map(cat => (
                <Fragment key={cat}>
                  <GroupHeaderRow colSpan={msColSpan} label={cat} variant="category" />
                  {(sortedRowsByCategory[cat] ?? []).map(row => (
                    <MarketStreamStkRow
                      key={row.symbol}
                      row={row}
                      categoryForDrag={cat}
                      dragEnabled={dragEnabled}
                      hasStreamAccounts={hasStreamAccounts}
                      accountViewMode={accountViewMode}
                      benchmarks={benchmarks}
                      onSymbolReorder={onSymbolReorder}
                    />
                  ))}
                </Fragment>
              ))}
              {optPositionRows.length > 0 && (
                <>
                  <GroupHeaderRow colSpan={msColSpan} label="Options" variant="category" />
                  {sortedOptRows.map(row => (
                    <MarketStreamOptRow
                      key={optBasisKey(row)}
                      row={row}
                      quote={quotesByContractKey[row.contract_key]}
                      basis={optionLiveBasisByRow.get(optBasisKey(row))}
                      streamHostId={streamHostId}
                      streamSecondaryId={streamSecondaryId}
                      hasStreamAccounts={hasStreamAccounts}
                      accountViewMode={accountViewMode}
                      optPremiumUnit={optPremiumUnit}
                      dragEnabled={dragEnabled}
                      onOptRowReorder={onOptRowReorder}
                    />
                  ))}
                </>
              )}
            </>
          )}
          {showTotalRow && (
            <GrandTotalRow labelColSpan={1} label={<strong>Total</strong>}>
              {hasStreamAccounts && totalAccountMetrics ? (
                <AccountMetricCells metrics={totalAccountMetrics} />
              ) : (
                <>
                  <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {costSum !== 0 ? fmtUsd(costSum, true) : '—'}
                  </DenseTableCell>
                </>
              )}
              <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
              <AccountDailyCells metrics={totalDailyMetrics} />
              {hasStreamAccounts && totalAccountMetrics ? (
                <AccountSinceCells metrics={totalAccountMetrics} useBasisPct />
              ) : (
                <>
                  <DenseTableCell className={denseTableNumCell}>
                    {pnlSum !== 0 ? (
                      <InlinePnl value={pnlSum}>{fmtUsd(pnlSum, true)}</InlinePnl>
                    ) : (
                      '—'
                    )}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {totalPct != null ? (
                      <InlinePnl value={totalPct}>{`${Math.abs(totalPct).toFixed(2)}%`}</InlinePnl>
                    ) : (
                      '—'
                    )}
                  </DenseTableCell>
                </>
              )}
            </GrandTotalRow>
          )}
        </DenseTableBody>
      </table>
    </div>
  )
}

function optBasisKey(row: OptPositionRow): string {
  return `${row.account_id.toLowerCase()}\t${row.contract_key}`
}
