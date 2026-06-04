import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  GrandTotalRow,
  GroupHeaderRow,
  GroupSubtotalRow,
  InlinePnl,
  DenseOptionCategoryLabel,
  denseTable,
  denseTableEntityCell,
  denseTableEntityLink,
  denseTableNumCell,
} from '@/components/data-display'
import {
  calcStockGroupTotals,
  computeStockPositionRowMetrics,
  groupStockPositionsByCategory,
  stockGroupPctFromTotals,
} from '@/utils/accountsStockPositions'
import { fmtUsd, fmtPct, formatLastUpdate } from '@/utils/positions'
import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem, DailyBenchmark } from '@/types/market'

interface Props {
  positions: IbPositionRow[]
  quotesBySymbol: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  onCategoryClick?: () => void
}

const COL_SPAN = 13
const LABEL_COL_SPAN = 3
const TRAILING_COL_SPAN = 3

const CATEGORY_HEADER_TITLE = 'Manage categories and assign to positions'

function SubtotalCells({
  totals,
}: {
  totals: ReturnType<typeof calcStockGroupTotals>
}) {
  const { dailyPct, changePct } = stockGroupPctFromTotals(totals)
  return (
    <>
      <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
        {fmtUsd(totals.totalCost)}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
        {fmtUsd(totals.totalMarket)}
      </DenseTableCell>
      <DenseTableCell />
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={dailyPct}>{fmtPct(dailyPct)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={totals.dailyUsd}>{fmtUsd(totals.dailyUsd)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={changePct}>{fmtPct(changePct)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={totals.changeUsd}>{fmtUsd(totals.changeUsd)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell colSpan={TRAILING_COL_SPAN} />
    </>
  )
}

function PositionRow({
  pos,
  quotesBySymbol,
  benchBySymbol,
}: {
  pos: IbPositionRow
  quotesBySymbol: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
}) {
  const sym = pos.symbol?.toUpperCase() ?? ''
  const r = computeStockPositionRowMetrics(
    pos,
    quotesBySymbol[sym],
    benchBySymbol[sym],
  )
  const lastDelta =
    pos.avgCost != null && r.currPrice != null ? r.currPrice - pos.avgCost : null

  return (
    <DenseTableRow>
      <DenseTableCell className={denseTableEntityCell}>
        {pos.symbol?.trim() ? (
          <span
            className={cn(
              denseTableEntityLink,
              'font-semibold tracking-wide text-entity-symbol',
            )}
          >
            {pos.symbol.trim().toUpperCase()}
          </span>
        ) : (
          '—'
        )}
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{pos.position ?? '—'}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{fmtUsd(pos.avgCost)}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{fmtUsd(r.totalCost)}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{fmtUsd(r.totalMarket)}</DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
        <InlinePnl value={lastDelta}>{fmtUsd(r.currPrice)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={r.dailyPct}>{fmtPct(r.dailyPct)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={r.dailyUsd}>{fmtUsd(r.dailyUsd)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={r.changePct}>{fmtPct(r.changePct)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
        <InlinePnl value={r.changeUsd}>{fmtUsd(r.changeUsd)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, denseTable.mutedMeta)}>
        {formatLastUpdate(r.updTs)}
      </DenseTableCell>
      <DenseTableCell className={denseTableEntityCell}>
        {pos.strategy_opportunity_name?.trim() ? (
          <DenseOptionCategoryLabel variant="opportunity" className="whitespace-normal">
            {pos.strategy_opportunity_name.trim()}
          </DenseOptionCategoryLabel>
        ) : (
          '—'
        )}
      </DenseTableCell>
      <DenseTableCell className={denseTableEntityCell}>
        {pos.strategy_instance_label?.trim() ? (
          <DenseOptionCategoryLabel variant="instance" className="whitespace-normal font-mono">
            {pos.strategy_instance_label.trim()}
          </DenseOptionCategoryLabel>
        ) : (
          '—'
        )}
      </DenseTableCell>
    </DenseTableRow>
  )
}

export function StockPositionsTable({
  positions,
  quotesBySymbol,
  benchBySymbol,
  onCategoryClick,
}: Props) {
  if (positions.length === 0) {
    return (
      <div className={denseTable.sectionBlock}>
        <h5 className={denseTable.sectionTitle}>Stock positions</h5>
        <p className={denseTable.emptyHint}>None</p>
      </div>
    )
  }

  const categories = groupStockPositionsByCategory(positions)
  const grand = calcStockGroupTotals(positions, quotesBySymbol, benchBySymbol)

  return (
    <div className={denseTable.sectionBlock}>
      <h5 className={denseTable.sectionTitle}>Stock positions</h5>
      <DenseDataTable tableClassName="min-w-[960px]">
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className="min-w-[5.5rem] max-w-none overflow-visible">
              Symbol
            </DenseTableHead>
            <DenseTableHead align="right">Qty</DenseTableHead>
            <DenseTableHead align="right">Cost</DenseTableHead>
            <DenseTableHead align="right">Total Cost</DenseTableHead>
            <DenseTableHead align="right">Total Mkt</DenseTableHead>
            <DenseTableHead align="right">Last</DenseTableHead>
            <DenseTableHead align="right">Daily %</DenseTableHead>
            <DenseTableHead align="right">Daily $</DenseTableHead>
            <DenseTableHead align="right">Chg %</DenseTableHead>
            <DenseTableHead align="right">Chg $</DenseTableHead>
            <DenseTableHead align="right">Upd</DenseTableHead>
            <DenseTableHead>Strategy</DenseTableHead>
            <DenseTableHead>Instance</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {categories.flatMap(({ category, rows }) => {
            const grp = calcStockGroupTotals(rows, quotesBySymbol, benchBySymbol)
            return [
              <GroupHeaderRow
                key={`cat-${category}`}
                colSpan={COL_SPAN}
                label={category}
                variant="category"
                onClick={onCategoryClick}
                title={onCategoryClick ? CATEGORY_HEADER_TITLE : undefined}
              />,
              ...rows.map((pos) => (
                <PositionRow
                  key={pos.contract_key ?? `${category}-${pos.symbol}`}
                  pos={pos}
                  quotesBySymbol={quotesBySymbol}
                  benchBySymbol={benchBySymbol}
                />
              )),
              <GroupSubtotalRow
                key={`sub-${category}`}
                labelColSpan={LABEL_COL_SPAN}
                label={`${category} subtotal`}
              >
                <SubtotalCells totals={grp} />
              </GroupSubtotalRow>,
            ]
          })}
          <GrandTotalRow labelColSpan={LABEL_COL_SPAN} label="Stock Total">
            <SubtotalCells totals={grand} />
          </GrandTotalRow>
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}
