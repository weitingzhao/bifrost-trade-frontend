import { Link } from 'react-router-dom'
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
  InlinePnl,
  denseTable,
  denseTableEntityCell,
  denseTableEntityLink,
  denseTableNumCell,
} from '@/components/data-display'
import {
  accountOptionContractLabel,
  calcOptionPremiumTotal,
  collectUnderlyingSpots,
  computeOptionPositionRowMetrics,
} from '@/utils/accountsOptionPositions'
import { fmtUsd, formatLastUpdate, fmtExpiry, rightLabel } from '@/utils/positions'
import { positionsSymbolHref } from '@/utils/portfolioLinks'
import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem } from '@/types/market'

interface Props {
  positions: IbPositionRow[]
  quotesByCk: Record<string, QuoteItem>
  quotesBySymbol?: Record<string, QuoteItem>
}

const LABEL_COL_SPAN = 7
const TRAILING_COL_SPAN = 4

const BOOK_TITLE = "Open this contract's line on Positions"

function PositionRow({
  pos,
  quote,
}: {
  pos: IbPositionRow
  quote: QuoteItem | undefined
}) {
  const m = computeOptionPositionRowMetrics(pos, quote)

  const contractLabel = accountOptionContractLabel(pos)

  return (
    <DenseTableRow>
      <DenseTableCell className={denseTableEntityCell}>
        {contractLabel ? (
          <span className={cn(denseTableEntityLink, 'font-mono font-semibold text-entity-option')}>
            {contractLabel}
          </span>
        ) : (
          '—'
        )}
      </DenseTableCell>
      <DenseTableCell className={denseTable.mutedMeta}>{rightLabel(pos.right)}</DenseTableCell>
      <DenseTableCell className="font-mono tabular-nums">
        {fmtExpiry(pos.expiry ?? pos.lastTradeDateOrContractMonth)}
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{fmtUsd(pos.strike)}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{m.qty || '—'}</DenseTableCell>
      <DenseTableCell className={denseTable.mutedMeta}>{m.side}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{fmtUsd(m.avgCost)}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={m.premium}>{fmtUsd(m.premium)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
        <InlinePnl value={m.lastDelta}>{fmtUsd(m.currPrice)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
        <InlinePnl value={m.changeUsd}>{fmtUsd(m.changeUsd)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableEntityCell}>
        {pos.symbol?.trim() ? (
          <Link
            to={positionsSymbolHref(pos.symbol)}
            className={cn(denseTableEntityLink, 'text-dense-meta whitespace-normal')}
            title={BOOK_TITLE}
          >
            {pos.strategy_opportunity_name?.trim() || 'Book →'}
          </Link>
        ) : (
          '—'
        )}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, denseTable.mutedMeta)}>
        {formatLastUpdate(m.updTs)}
      </DenseTableCell>
    </DenseTableRow>
  )
}

export function OptionPositionsTable({ positions, quotesByCk, quotesBySymbol }: Props) {
  if (positions.length === 0) {
    return (
      <div className={denseTable.sectionBlock}>
        <h5 className={denseTable.sectionTitle}>Option positions</h5>
        <p className={denseTable.emptyHint}>None</p>
      </div>
    )
  }

  const totalPremium = calcOptionPremiumTotal(positions)
  const spotBySymbol = collectUnderlyingSpots(positions, quotesBySymbol)

  return (
    <div className={denseTable.sectionBlock}>
      <h5 className={denseTable.sectionTitle}>Option positions</h5>
      <p className={denseTable.emptyHint}>
        As the broker reports them. Daily change, cushion and the strategy each contract belongs to are on Positions.
      </p>
      <DenseDataTable tableClassName="min-w-[900px] table-fixed">
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className="min-w-[5.5rem]">Contract</DenseTableHead>
            <DenseTableHead>Right</DenseTableHead>
            <DenseTableHead>Expiry</DenseTableHead>
            <DenseTableHead align="right">Strike</DenseTableHead>
            <DenseTableHead align="right">Qty</DenseTableHead>
            <DenseTableHead>Side</DenseTableHead>
            <DenseTableHead align="right">Cost</DenseTableHead>
            <DenseTableHead align="right">Premium</DenseTableHead>
            <DenseTableHead align="right">Last</DenseTableHead>
            <DenseTableHead align="right" title="IB's unrealized P&L for the contract">
              Unrealized
            </DenseTableHead>
            <DenseTableHead>Book</DenseTableHead>
            <DenseTableHead align="right">Upd</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {positions.map((pos, i) => {
            const ck = pos.contract_key ?? ''
            return (
              <PositionRow
                key={ck || i}
                pos={pos}
                quote={quotesByCk[ck]}
              />
            )
          })}
          <GrandTotalRow
            labelColSpan={LABEL_COL_SPAN}
            label={
              <>
                <span>Option Premium Total</span>
                {Object.entries(spotBySymbol).map(([sym, spot]) => (
                  <span key={sym} className="ml-2 font-normal text-muted-foreground">
                    {sym} spot {fmtUsd(spot)}
                  </span>
                ))}
              </>
            }
          >
            <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
              <InlinePnl value={totalPremium}>{fmtUsd(totalPremium)}</InlinePnl>
            </DenseTableCell>
            <DenseTableCell colSpan={TRAILING_COL_SPAN} />
          </GrandTotalRow>
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}
