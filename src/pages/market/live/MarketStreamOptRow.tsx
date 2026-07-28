import type { QuoteItem } from '@/types/market'
import { cn } from '@/lib/utils'
import {
  DenseTableCell,
  InlinePnl,
  denseTableEntityCell,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import {
  computeOptMidAndLivePnl,
  describeOptionLegMtm,
  effectiveOptAvgCostPerShareForMtm,
  resolveOptAvgCostPerShareForMtm,
  type OptionLiveBasis,
} from '@/utils/optionLiveBasis'
import { optBasisKey, type OptPositionRow } from '@/utils/marketStreamsRows'
import {
  scaleOptPremiumDisplay,
  sincePctFromBasis,
  type OptPremiumUnit,
  type StreamAccountViewMode,
} from '@/utils/streamAccountView'
import { liveTable } from './liveTableClasses'
import { OptQuoteAgeLabel } from './OptQuoteAgeLabel'
import styles from './live.module.css'

interface Props {
  row: OptPositionRow
  quote: QuoteItem | undefined
  basis: OptionLiveBasis | undefined
  streamHostId: string | null
  streamSecondaryId: string | null
  hasStreamAccounts: boolean
  accountViewMode?: StreamAccountViewMode
  /** Contract = premium × 100 (一手); Share = $/sh (一股). Default contract. */
  optPremiumUnit?: OptPremiumUnit
  dragEnabled: boolean
  onOptRowReorder?: (fromBasisKey: string, toBasisKey: string) => void
}

function optQtyLabel(qty: number): string {
  if (qty > 0) return `Long ${qty}`
  if (qty < 0) return `Short ${Math.abs(qty)}`
  return '—'
}

export function MarketStreamOptRow({
  row,
  quote,
  basis,
  streamHostId,
  streamSecondaryId,
  hasStreamAccounts,
  accountViewMode = 'combine',
  optPremiumUnit = 'contract',
  dragEnabled,
  onOptRowReorder,
}: Props) {
  const basisKey = optBasisKey(row)
  const { mid, livePnl } = computeOptMidAndLivePnl(row, quote, basis)
  const avgForPnl = effectiveOptAvgCostPerShareForMtm(
    row,
    resolveOptAvgCostPerShareForMtm(row, basis),
  )
  const displayMid = scaleOptPremiumDisplay(mid, optPremiumUnit)
  const displayCost = scaleOptPremiumDisplay(avgForPnl, optPremiumUnit)
  const displayBid = scaleOptPremiumDisplay(quote?.bid, optPremiumUnit)
  const displayAsk = scaleOptPremiumDisplay(quote?.ask, optPremiumUnit)
  const unitHint = optPremiumUnit === 'contract' ? '$/contract (×100)' : '$/share'

  const mtmTooltip =
    mid != null && avgForPnl != null && Number.isFinite(row.qty) && row.qty !== 0
      ? [
          `MTM: (mid ${mid.toFixed(4)} − avg $/sh ${avgForPnl.toFixed(4)}) × ${row.qty} contracts × 100`,
          `Cost/Last shown as ${unitHint}. Since $ is always full USD (already ×100).`,
          `Since % = Since $ / |cost basis| (position return; Short flips vs raw price move).`,
          `${describeOptionLegMtm(row)} — Short legs: if IB avgCost is negative (credit), we convert to +$/sh for MTM.`,
        ].join('\n')
      : `Live MTM needs quote mid and avg $/share (${describeOptionLegMtm(row)}).`

  const contractLabel = row.symbol
    ? `${row.symbol} ${row.right === 'C' ? 'CALL' : row.right === 'P' ? 'PUT' : row.right} ${row.strike}`
    : row.contract_key

  const accIdNorm = (row.account_id ?? '').trim().toLowerCase()
  const isHost = streamHostId != null && accIdNorm === streamHostId.trim().toLowerCase()
  const isSecondary =
    streamSecondaryId != null && accIdNorm === streamSecondaryId.trim().toLowerCase()

  const qtyLabel = optQtyLabel(row.qty)
  const costLabel =
    displayCost != null && Number.isFinite(displayCost) ? fmtUsd(displayCost) : '—'
  // Position return (not raw price move): Short profits when mid < avg → same sign as Since $.
  const optCostBasis =
    avgForPnl != null && Number.isFinite(avgForPnl) && Number.isFinite(row.qty) && row.qty !== 0
      ? Math.abs(avgForPnl * row.qty * 100)
      : null
  const sincePct = sincePctFromBasis(optCostBasis, livePnl)
  const pctLabel =
    sincePct != null ? (
      <InlinePnl value={sincePct}>{`${Math.abs(sincePct).toFixed(2)}%`}</InlinePnl>
    ) : (
      '—'
    )
  const pnlLabel =
    livePnl != null ? <InlinePnl value={livePnl}>{fmtUsd(livePnl, true)}</InlinePnl> : '—'
  const showSplit = hasStreamAccounts && accountViewMode === 'all'

  const sinceDollarPctCells = showSplit ? (
    <>
      <DenseTableCell className={denseTableNumCell}>
        <span className="whitespace-nowrap">
          {isHost ? pnlLabel : '—'}
          <span className={liveTable.accountSplitSep}>/</span>
          {isSecondary ? pnlLabel : '—'}
        </span>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell} title={mtmTooltip}>
        <span className="whitespace-nowrap">
          {isHost ? pctLabel : '—'}
          <span className={liveTable.accountSplitSep}>/</span>
          {isSecondary ? pctLabel : '—'}
        </span>
      </DenseTableCell>
    </>
  ) : (
    <>
      <DenseTableCell className={denseTableNumCell}>{pnlLabel}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell} title={mtmTooltip}>
        {pctLabel}
      </DenseTableCell>
    </>
  )

  return (
    <tr
      onDragOver={dragEnabled ? e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } : undefined}
      onDrop={
        dragEnabled && onOptRowReorder
          ? e => {
              e.preventDefault()
              try {
                const raw = e.dataTransfer.getData('application/x-market-streams-opt-row')
                if (!raw) return
                const { basisKey: fromKey } = JSON.parse(raw) as { basisKey: string }
                if (fromKey !== basisKey) onOptRowReorder(fromKey, basisKey)
              } catch {
                /* ignore */
              }
            }
          : undefined
      }
    >
      <DenseTableCell className={denseTableEntityCell} title={contractLabel}>
        <span className="inline-flex min-w-0 max-w-full items-center gap-1">
          {dragEnabled && (
            <span
              className={styles.dragHandle}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData(
                  'application/x-market-streams-opt-row',
                  JSON.stringify({ basisKey }),
                )
                e.dataTransfer.effectAllowed = 'move'
              }}
              title="Drag to reorder option row"
              aria-hidden
            >
              ⋮⋮
            </span>
          )}
          <span className="font-mono font-semibold text-entity-option">{contractLabel}</span>
          <OptQuoteAgeLabel ts={quote?.ts ?? quote?.updated_ts} />
        </span>
      </DenseTableCell>

      {hasStreamAccounts ? (
        showSplit ? (
          <>
            <DenseTableCell className={denseTableNumCell}>
              <span className="whitespace-nowrap">
                {isHost ? qtyLabel : '—'}
                <span className={liveTable.accountSplitSep}>/</span>
                {isSecondary ? qtyLabel : '—'}
              </span>
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              <span className="whitespace-nowrap">
                {isHost ? costLabel : '—'}
                <span className={liveTable.accountSplitSep}>/</span>
                {isSecondary ? costLabel : '—'}
              </span>
            </DenseTableCell>
          </>
        ) : (
          <>
            <DenseTableCell className={denseTableNumCell}>{qtyLabel}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{costLabel}</DenseTableCell>
          </>
        )
      ) : (
        <>
          <DenseTableCell className={denseTableNumCell}>{qtyLabel}</DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>{costLabel}</DenseTableCell>
        </>
      )}

      <DenseTableCell className={cn(denseTableNumCell, liveTable.lastBidAsk)}>
        {quote ? (
          <>
            {displayMid != null ? fmtUsd(displayMid) : '—'}
            {displayBid != null && displayAsk != null && (
              <span className={liveTable.bidAskSpread}>
                {' '}
                {displayBid.toFixed(2)}/{displayAsk.toFixed(2)}
              </span>
            )}
          </>
        ) : (
          '—'
        )}
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
      {sinceDollarPctCells}
    </tr>
  )
}
