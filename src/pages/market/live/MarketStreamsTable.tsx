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
  marketStreamsSortFamily,
  MARKET_STREAMS_SORT_LINE,
  type MarketStreamsSortFamily,
  marketStreamsSortHeaderMeta,
} from '@/utils/marketStreamsSort'
import type { OptionLiveBasis } from '@/utils/optionLiveBasis'
import { computeOptMidAndLivePnl } from '@/utils/optionLiveBasis'
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
function marketStreamsColSpan(hasStreamAccounts: boolean): number {
  void hasStreamAccounts
  return 8
}

/**
 * The two cells a group header carries under Since $ — the design puts the
 * category’s own subtotal on its row («Core 3 … +$1,260»). A sum of
 * unknowns stays —, and a partial sum names how many rows it left out.
 */
function SinceSubtotalCells({ totalPnl, unpriced }: { totalPnl: number | null; unpriced: number }) {
  return (
    <>
      <DenseTableCell
        className={cn(denseTableNumCell, 'border-y border-border bg-secondary/60 font-semibold')}
        title={
          totalPnl == null
            ? `None of the ${unpriced} rows has a Since $ to add — not a zero`
            : unpriced > 0
              ? `Sum of the priced rows; ${unpriced} row${unpriced === 1 ? '' : 's'} not priced and not counted`
              : undefined
        }
      >
        {totalPnl == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <>
            <InlinePnl value={totalPnl}>{fmtUsd(totalPnl, true)}</InlinePnl>
            {unpriced > 0 ? <span className="ml-1 font-normal text-muted-foreground">+{unpriced}?</span> : null}
          </>
        )}
      </DenseTableCell>
      <DenseTableCell className="border-y border-border bg-secondary/60" />
    </>
  )
}

/** Count + Since $ over one category’s stock rows, nulls kept honest. */
function stkGroupStats(rows: MarketStreamsRow[]): { count: number; totalPnl: number | null; unpriced: number } {
  const vals = rows.map((r) => (r.pnlCost != null && Number.isFinite(r.pnlCost) ? r.pnlCost : null))
  const known = vals.filter((v): v is number => v != null)
  return { count: rows.length, totalPnl: known.length > 0 ? known.reduce((a, b) => a + b, 0) : null, unpriced: vals.length - known.length }
}

/** The design’s group label: name, then the row count in quiet ink. */
function groupLabelWithCount(label: string, count: number) {
  return (
    <>
      {label}
      <span className="ml-1.5 font-normal text-muted-foreground">{count}</span>
    </>
  )
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

/**
 * The accent per sort family (design Rev 2026-09-23.2): A–Z blue, T+ amber,
 * T+S+ violet, E+ fuchsia, Default ink. None of them is a severity colour —
 * the header used `--color-success` for T+S+, and a column header is neither
 * a dot nor a tag. The sort line under the section header takes the same
 * accent, so the header and the sentence that explains it read as one thing.
 */
const SORT_ACCENT: Record<MarketStreamsSortFamily, string> = {
  def: 'text-foreground',
  alpha: 'text-blue-300',
  type: 'text-amber-400',
  side: 'text-violet-300',
  exp: 'text-fuchsia-300',
}

/** Which sort is standing and what order it produces, in the design's words. */
function SortLine({ mode }: { mode: MarketStreamsSortMode }) {
  const line = MARKET_STREAMS_SORT_LINE[mode]
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b border-border px-3 py-1.25 text-dense-caption text-muted-foreground">
      <span>Sort</span>
      <span className={cn('font-semibold', SORT_ACCENT[marketStreamsSortFamily(mode)])}>{line.name}</span>
      <span>· {line.order}</span>
      <span className="ml-auto">{line.hint}</span>
    </div>
  )
}

function SortHeaderButton({
  mode,
  onCycleSort,
}: {
  mode: MarketStreamsSortMode
  onCycleSort: () => void
}) {
  const meta = marketStreamsSortHeaderMeta(mode)
  const accentClass = SORT_ACCENT[marketStreamsSortFamily(mode)]

  return (
    <button
      type="button"
      className={cn(styles.sortHeader, accentClass)}
      onClick={onCycleSort}
      title="Click to cycle: Default → A–Z → Z–A → T+ ▲▼ (type) → T+S+ ▲▼ (type × side) → E+ ▲▼ (expiry) → Default"
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
  // The Options group's own Since $, from the same live-basis math its rows
  // print — one source, so the header cannot disagree with the rows.
  const optGroupStats = (() => {
    const vals = sortedOptRows.map((r) => {
      const basis = optionLiveBasisByRow.get(optBasisKey(r))
      const v = computeOptMidAndLivePnl(r, quotesByContractKey[r.contract_key], basis).livePnl
      return v != null && Number.isFinite(v) ? v : null
    })
    const known = vals.filter((v): v is number => v != null)
    return { totalPnl: known.length > 0 ? known.reduce((a, b) => a + b, 0) : null, unpriced: vals.length - known.length }
  })()
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
      <SortLine mode={msSortMode} />
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
                  // A group called "Total Long Stocks" owes its total. It was
                  // already computed (totalPnl) and never drawn; it sits under
                  // Since $ because that is the column it sums (design Rev
                  // 2026-09-23.2).
                  <GroupHeaderRow
                    colSpan={msColSpan - 2}
                    label={g.label}
                    variant="category"
                    trailing={<SinceSubtotalCells totalPnl={g.totalPnl} unpriced={g.unpriced} />}
                  />
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
              {categoryOrderFiltered.map(cat => {
                const stats = stkGroupStats(sortedRowsByCategory[cat] ?? [])
                return (
                <Fragment key={cat}>
                  <GroupHeaderRow
                    colSpan={msColSpan - 2}
                    label={groupLabelWithCount(cat, stats.count)}
                    variant="category"
                    trailing={<SinceSubtotalCells totalPnl={stats.totalPnl} unpriced={stats.unpriced} />}
                  />
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
                )
              })}
              {optPositionRows.length > 0 && (
                <>
                  <GroupHeaderRow
                    colSpan={msColSpan - 2}
                    label={groupLabelWithCount('Options', sortedOptRows.length)}
                    variant="category"
                    trailing={<SinceSubtotalCells {...optGroupStats} />}
                  />
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
