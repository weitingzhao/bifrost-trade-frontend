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
import { MarketStreamStkRow } from './MarketStreamStkRow'
import { MarketStreamOptRow } from './MarketStreamOptRow'
import { LiveStackedPnlCell } from './LiveStackedPnlCell'
import { liveTable } from './liveTableClasses'
import styles from './live.module.css'
import { liveEmptyHintClass } from './liveUi'

function marketStreamsColSpan(hasStreamAccounts: boolean): number {
  return hasStreamAccounts ? 12 : 6
}

interface Props {
  hasStreamAccounts: boolean
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

  const totalCost = filteredRows.reduce((a, r) => {
    const q = r.qty != null && Number.isFinite(r.qty) ? r.qty : 0
    const c = r.avgCost != null && Number.isFinite(r.avgCost) ? r.avgCost : 0
    return a + q * c
  }, 0)

  const totalCostPnl = filteredRows.reduce(
    (a, r) => a + (r.pnlCost != null && Number.isFinite(r.pnlCost) ? r.pnlCost : 0),
    0,
  )

  const totalPct = totalCost > 0 && Number.isFinite(totalCostPnl) ? (totalCostPnl / totalCost) * 100 : null

  const hostCostSum = filteredRows.reduce((a, r) => {
    const q = r.hostQty != null && Number.isFinite(r.hostQty) ? r.hostQty : 0
    const c = r.hostAvgCost != null && Number.isFinite(r.hostAvgCost) ? r.hostAvgCost : 0
    return a + q * c
  }, 0)

  const hostPnlSum = filteredRows.reduce(
    (a, r) => a + (r.hostPnlCost != null && Number.isFinite(r.hostPnlCost) ? r.hostPnlCost : 0),
    0,
  )

  const secondaryCostSum = filteredRows.reduce((a, r) => {
    const q = r.secondaryQty != null && Number.isFinite(r.secondaryQty) ? r.secondaryQty : 0
    const c = r.secondaryAvgCost != null && Number.isFinite(r.secondaryAvgCost) ? r.secondaryAvgCost : 0
    return a + q * c
  }, 0)

  const secondaryPnlSum = filteredRows.reduce(
    (a, r) => a + (r.secondaryPnlCost != null && Number.isFinite(r.secondaryPnlCost) ? r.secondaryPnlCost : 0),
    0,
  )

  const { totalDailyDollar, totalDailyPct } = marketStreamsDailyTotals

  const showTotalRow =
    (filteredRows.length > 0 || optPositionRows.length > 0) && filteredRows.length > 0

  return (
    <div className={liveTable.shell}>
      <table className={liveTable.table}>
        <DenseTableHeader className={liveTable.stickyThead}>
          <DenseTableHeadRow>
            <DenseTableHead scope="col" className="normal-case">
              <SortHeaderButton mode={msSortMode} onCycleSort={onCycleSort} />
            </DenseTableHead>
            {hasStreamAccounts && (
              <>
                <DenseTableHead colSpan={3} scope="colgroup" className={liveTable.colGroupHead}>
                  Host
                </DenseTableHead>
                <DenseTableHead colSpan={3} scope="colgroup" className={liveTable.colGroupHead}>
                  Secondary
                </DenseTableHead>
              </>
            )}
            <DenseTableHead>Qty</DenseTableHead>
            <DenseTableHead>Cost</DenseTableHead>
            <DenseTableHead title="Last price; Bid and Ask shown as spread vs Last">
              Last (Bid / Ask)
            </DenseTableHead>
            <DenseTableHead align="right" className={liveTable.stackedPnlHead}>
              Daily
              <span className={liveTable.stackedPnlHeadSub}>% / $</span>
            </DenseTableHead>
            <DenseTableHead align="right" className={liveTable.stackedPnlHead}>
              SINCE
              <span className={liveTable.stackedPnlHeadSub}>% / $</span>
            </DenseTableHead>
          </DenseTableHeadRow>
          {hasStreamAccounts && (
            <DenseTableHeadRow>
              <DenseTableHead aria-hidden />
              <DenseTableHead align="right">Qty</DenseTableHead>
              <DenseTableHead align="right">Cost</DenseTableHead>
              <DenseTableHead align="right">SINCE $</DenseTableHead>
              <DenseTableHead align="right">Qty</DenseTableHead>
              <DenseTableHead align="right">Cost</DenseTableHead>
              <DenseTableHead align="right">SINCE $</DenseTableHead>
              <DenseTableHead colSpan={5} aria-hidden />
            </DenseTableHeadRow>
          )}
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
              {hasStreamAccounts && (
                <>
                  <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {hostCostSum !== 0 ? fmtUsd(hostCostSum, true) : '—'}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {hostPnlSum !== 0 ? (
                      <InlinePnl value={hostPnlSum}>{fmtUsd(hostPnlSum, true)}</InlinePnl>
                    ) : (
                      '—'
                    )}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {secondaryCostSum !== 0 ? fmtUsd(secondaryCostSum, true) : '—'}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {secondaryPnlSum !== 0 ? (
                      <InlinePnl value={secondaryPnlSum}>{fmtUsd(secondaryPnlSum, true)}</InlinePnl>
                    ) : (
                      '—'
                    )}
                  </DenseTableCell>
                </>
              )}
              <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {totalCost !== 0 ? fmtUsd(totalCost, true) : '—'}
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                <LiveStackedPnlCell
                  pct={totalDailyPct}
                  dollar={totalDailyDollar}
                  formatPct={v => `${v.toFixed(2)}%`}
                  formatDollar={v => fmtUsd(v, true)}
                />
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                <LiveStackedPnlCell
                  pct={totalPct}
                  dollar={totalCostPnl}
                  formatPct={v => `${v.toFixed(2)}%`}
                  formatDollar={v => fmtUsd(v, true)}
                />
              </DenseTableCell>
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
