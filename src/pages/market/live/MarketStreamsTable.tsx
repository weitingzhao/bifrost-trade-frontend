import { Fragment } from 'react'
import type { DailyBenchmark, QuoteItem } from '@/types/market'
import { cn } from '@/lib/utils'
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
import styles from './live.module.css'

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

function pnlClass(v: number | null | undefined): string {
  if (v == null || v === 0) return ''
  return v > 0 ? styles.pnlPositive : styles.pnlNegative
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

  const renderBody = () => {
    if (filteredRows.length === 0 && optPositionRows.length === 0) {
      return (
        <tr>
          <td colSpan={msColSpan} className={styles.emptyHint}>
            No market stream symbols
          </td>
        </tr>
      )
    }

    if (unifiedGroupedRows) {
      return unifiedGroupedRows.map(g => (
        <Fragment key={g.label || 'flat'}>
          {g.showGroupHeader && g.label && (
            <tr className={styles.groupHeader}>
              <td colSpan={msColSpan}>{g.label}</td>
            </tr>
          )}
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
    }

    return (
      <>
        {categoryOrderFiltered.map(cat => (
          <Fragment key={cat}>
            <tr className={styles.groupHeader}>
              <td colSpan={msColSpan}>{cat}</td>
            </tr>
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
            <tr className={styles.groupHeader}>
              <td colSpan={msColSpan}>Options</td>
            </tr>
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
    )
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">
              <SortHeaderButton mode={msSortMode} onCycleSort={onCycleSort} />
            </th>
            {hasStreamAccounts && (
              <>
                <th colSpan={3} scope="colgroup" className={styles.colGroup}>
                  Host
                </th>
                <th colSpan={3} scope="colgroup" className={styles.colGroup}>
                  Secondary
                </th>
              </>
            )}
            <th>Qty</th>
            <th>Cost</th>
            <th title="Last price; Bid and Ask shown as spread vs Last">Last (Bid / Ask)</th>
            <th className={styles.pnlStackedTh}>
              Daily
              <span className={styles.pnlStackedSub}>% / $</span>
            </th>
            <th className={styles.pnlStackedTh}>
              SINCE
              <span className={styles.pnlStackedSub}>% / $</span>
            </th>
          </tr>
          {hasStreamAccounts && (
            <tr>
              <th aria-hidden />
              <th>Qty</th>
              <th>Cost</th>
              <th>SINCE $</th>
              <th>Qty</th>
              <th>Cost</th>
              <th>SINCE $</th>
              <th colSpan={5} aria-hidden />
            </tr>
          )}
        </thead>
        <tbody>{renderBody()}</tbody>
        {(filteredRows.length > 0 || optPositionRows.length > 0) && filteredRows.length > 0 && (
          <tfoot>
            <tr className={styles.sumRow}>
              <td><strong>Total</strong></td>
              {hasStreamAccounts && (
                <>
                  <td className={styles.numCell}>—</td>
                  <td className={styles.numCell}>{hostCostSum !== 0 ? fmtUsd(hostCostSum, true) : '—'}</td>
                  <td className={cn(styles.numCell, pnlClass(hostPnlSum))}>
                    {hostPnlSum !== 0 ? fmtUsd(hostPnlSum, true) : '—'}
                  </td>
                  <td className={styles.numCell}>—</td>
                  <td className={styles.numCell}>
                    {secondaryCostSum !== 0 ? fmtUsd(secondaryCostSum, true) : '—'}
                  </td>
                  <td className={cn(styles.numCell, pnlClass(secondaryPnlSum))}>
                    {secondaryPnlSum !== 0 ? fmtUsd(secondaryPnlSum, true) : '—'}
                  </td>
                </>
              )}
              <td className={styles.numCell}>—</td>
              <td className={styles.numCell}>{totalCost !== 0 ? fmtUsd(totalCost, true) : '—'}</td>
              <td className={styles.numCell}>—</td>
              <td className={styles.numCell}>
                <span className={styles.pnlStackedLine}>
                  {totalDailyPct != null && Number.isFinite(totalDailyPct) ? (
                    <span className={pnlClass(totalDailyPct)}>{Math.abs(totalDailyPct).toFixed(2)}%</span>
                  ) : (
                    '—'
                  )}
                </span>
                <span className={styles.pnlStackedLine}>
                  <span className={pnlClass(totalDailyDollar)}>
                    {totalDailyPct != null || totalDailyDollar !== 0 ? fmtUsd(totalDailyDollar, true) : '—'}
                  </span>
                </span>
              </td>
              <td className={styles.numCell}>
                <span className={styles.pnlStackedLine}>
                  {totalPct != null && Number.isFinite(totalPct) ? (
                    <span className={pnlClass(totalPct)}>{Math.abs(totalPct).toFixed(2)}%</span>
                  ) : (
                    '—'
                  )}
                </span>
                <span className={styles.pnlStackedLine}>
                  <span className={pnlClass(totalCostPnl)}>
                    {totalCostPnl !== 0 ? fmtUsd(totalCostPnl, true) : '—'}
                  </span>
                </span>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

function optBasisKey(row: OptPositionRow): string {
  return `${row.account_id.toLowerCase()}\t${row.contract_key}`
}
