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
  DenseOptionCategoryLabel,
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
import { fmtUsd, fmtPct, formatLastUpdate, fmtExpiry, rightLabel } from '@/utils/positions'
import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem } from '@/types/market'

interface Props {
  positions: IbPositionRow[]
  quotesByCk: Record<string, QuoteItem>
  quotesBySymbol?: Record<string, QuoteItem>
}

const LABEL_COL_SPAN = 7
const TRAILING_COL_SPAN = 7

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
      <DenseTableCell className={cn(denseTableEntityCell, 'align-top')}>
        {m.intrinsic != null && (
          <span className={cn(denseTable.mutedMeta, 'block font-mono tabular-nums')}>
            {fmtUsd(m.intrinsic)} intr.
          </span>
        )}
        {pos.strategy_opportunity_name?.trim() ? (
          <DenseOptionCategoryLabel variant="opportunity" className="mt-0.5 whitespace-normal">
            {pos.strategy_opportunity_name.trim()}
          </DenseOptionCategoryLabel>
        ) : null}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
        <InlinePnl value={m.lastDelta}>{fmtUsd(m.currPrice)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={m.dailyPct}>{fmtPct(m.dailyPct)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={m.dailyUsd}>{fmtUsd(m.dailyUsd)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <InlinePnl value={m.changePct}>{fmtPct(m.changePct)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
        <InlinePnl value={m.changeUsd}>{fmtUsd(m.changeUsd)}</InlinePnl>
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
      <DenseDataTable tableClassName="min-w-[1100px] table-fixed">
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
            <DenseTableHead>Details</DenseTableHead>
            <DenseTableHead align="right">Last</DenseTableHead>
            <DenseTableHead align="right">Daily %</DenseTableHead>
            <DenseTableHead align="right">Daily $</DenseTableHead>
            <DenseTableHead align="right">Chg %</DenseTableHead>
            <DenseTableHead align="right">Chg $</DenseTableHead>
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
