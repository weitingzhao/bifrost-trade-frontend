import { Link } from 'react-router-dom'
import { fmtPctSigned } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseLinkButton,
  GrandTotalRow,
  GroupHeaderRow,
  GroupSubtotalRow,
  InlinePnl,
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
import { fmtUsd, formatLastUpdate, quoteTimestamp } from '@/utils/positions'
import { positionsSymbolHref } from '@/utils/portfolioLinks'
import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem, DailyBenchmark } from '@/types/market'

const PRICE_AS_OF_STALE_TITLE =
  "no live quote; showing the snapshot's price timestamp"

interface Props {
  positions: IbPositionRow[]
  quotesBySymbol: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  onCategoryClick?: () => void
  onSymbolClick?: (symbol: string) => void
  hideTitle?: boolean
}

const COL_SPAN = 12
const LABEL_COL_SPAN = 3
const TRAILING_COL_SPAN = 2

const BOOK_TITLE = "Open this symbol's lines on Positions"

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
        <InlinePnl value={dailyPct}>{fmtPctSigned(dailyPct)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={totals.dailyUsd}>{fmtUsd(totals.dailyUsd)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={changePct}>{fmtPctSigned(changePct)}</InlinePnl>
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
  onSymbolClick,
}: {
  pos: IbPositionRow
  quotesBySymbol: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  onSymbolClick?: (symbol: string) => void
}) {
  const sym = pos.symbol?.toUpperCase() ?? ''
  const bookLabel = pos.strategy_instance_label?.trim() || pos.strategy_opportunity_name?.trim() || ''
  const quote = quotesBySymbol[sym]
  const r = computeStockPositionRowMetrics(pos, quote, benchBySymbol[sym])
  const lastDelta =
    pos.avgCost != null && r.currPrice != null ? r.currPrice - pos.avgCost : null
  const liveQuote = quote?.last != null && Number.isFinite(quote.last)
  const asOfTs = liveQuote ? quoteTimestamp(quote) : (pos.price_updated_at ?? r.updTs)
  const asOfTitle = liveQuote ? undefined : PRICE_AS_OF_STALE_TITLE

  return (
    <DenseTableRow>
      <DenseTableCell className={denseTableEntityCell}>
        {pos.symbol?.trim() ? (
          onSymbolClick ? (
            <DenseLinkButton
              label={pos.symbol.trim().toUpperCase()}
              ariaLabel={`Open ${pos.symbol.trim().toUpperCase()} in the inspector`}
              onClick={() => onSymbolClick(pos.symbol!.trim().toUpperCase())}
            />
          ) : (
            <span
              className={cn(
                denseTableEntityLink,
                'font-semibold tracking-wide text-entity-symbol',
              )}
            >
              {pos.symbol.trim().toUpperCase()}
            </span>
          )
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
        <InlinePnl value={r.dailyPct}>{fmtPctSigned(r.dailyPct)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={r.dailyUsd}>{fmtUsd(r.dailyUsd)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={r.changePct}>{fmtPctSigned(r.changePct)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
        <InlinePnl value={r.changeUsd}>{fmtUsd(r.changeUsd)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell
        className={cn(denseTableNumCell, denseTable.mutedMeta, !liveQuote && 'text-muted-foreground/70')}
        title={asOfTitle}
      >
        {formatLastUpdate(asOfTs)}
      </DenseTableCell>
      <DenseTableCell className={denseTableEntityCell}>
        {bookLabel && pos.symbol?.trim() ? (
          <Link
            to={positionsSymbolHref(pos.symbol)}
            className={cn(denseTableEntityLink, 'text-dense-meta whitespace-normal')}
            title={BOOK_TITLE}
          >
            {bookLabel}
          </Link>
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
  onSymbolClick,
  hideTitle,
}: Props) {
  if (positions.length === 0) {
    return hideTitle ? (
      <p className={denseTable.emptyHint}>None</p>
    ) : (
      <div className={denseTable.sectionBlock}>
        <h5 className={denseTable.sectionTitle}>Stock positions</h5>
        <p className={denseTable.emptyHint}>None</p>
      </div>
    )
  }

  const categories = groupStockPositionsByCategory(positions)
  const grand = calcStockGroupTotals(positions, quotesBySymbol, benchBySymbol)

  const table = (
      <DenseDataTable wrapClassName={denseTable.scrollX} tableClassName="min-w-[1080px]">
        <colgroup>
          <col style={{ width: '7%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '9%' }} />
        </colgroup>
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
            <DenseTableHead
              align="right"
              title="Quote time when a live last is present; otherwise the snapshot's price timestamp"
            >
              Price as of
            </DenseTableHead>
            <DenseTableHead title="The strategy line this holding belongs to, on Positions">Book</DenseTableHead>
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
                  onSymbolClick={onSymbolClick}
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
  )

  if (hideTitle) return table

  return (
    <div className={denseTable.sectionBlock}>
      <h5 className={denseTable.sectionTitle}>Stock positions</h5>
      {table}
    </div>
  )
}
