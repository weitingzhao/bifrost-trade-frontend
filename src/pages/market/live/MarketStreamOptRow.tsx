import type { QuoteItem } from '@/types/market'
import { cn } from '@/lib/utils'
import { DenseTableCell, InlinePnl, denseTableNumCell } from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import {
  computeOptMidAndLivePnl,
  describeOptionLegMtm,
  effectiveOptAvgCostPerShareForMtm,
  resolveOptAvgCostPerShareForMtm,
  type OptionLiveBasis,
} from '@/utils/optionLiveBasis'
import { optBasisKey, type OptPositionRow } from '@/utils/marketStreamsRows'
import { liveTable } from './liveTableClasses'
import styles from './live.module.css'

interface Props {
  row: OptPositionRow
  quote: QuoteItem | undefined
  basis: OptionLiveBasis | undefined
  streamHostId: string | null
  streamSecondaryId: string | null
  hasStreamAccounts: boolean
  dragEnabled: boolean
  onOptRowReorder?: (fromBasisKey: string, toBasisKey: string) => void
}

export function MarketStreamOptRow({
  row,
  quote,
  basis,
  streamHostId,
  streamSecondaryId,
  hasStreamAccounts,
  dragEnabled,
  onOptRowReorder,
}: Props) {
  const basisKey = optBasisKey(row)
  const { mid, livePnl } = computeOptMidAndLivePnl(row, quote, basis)
  const avgForPnl = effectiveOptAvgCostPerShareForMtm(
    row,
    resolveOptAvgCostPerShareForMtm(row, basis),
  )
  const mtmTooltip =
    mid != null && avgForPnl != null && Number.isFinite(row.qty) && row.qty !== 0
      ? [
          `MTM: (mid ${mid.toFixed(4)} − avg $/sh ${avgForPnl.toFixed(4)}) × ${row.qty} contracts × 100`,
          `${describeOptionLegMtm(row)} — Short legs: if IB avgCost is negative (credit), we convert to +$/sh for MTM.`,
        ].join('\n')
      : `Live MTM needs quote mid and avg $/share (${describeOptionLegMtm(row)}).`

  const contractLabel = row.symbol
    ? `${row.symbol} ${row.right === 'C' ? 'CALL' : row.right === 'P' ? 'PUT' : row.right} ${row.strike}`
    : row.contract_key

  const accIdNorm = (row.account_id ?? '').trim().toLowerCase()
  const isHost = streamHostId != null && accIdNorm === streamHostId.trim().toLowerCase()
  const isSecondary = streamSecondaryId != null && accIdNorm === streamSecondaryId.trim().toLowerCase()

  const qtyCell = row.qty > 0 ? `Long ${row.qty}` : row.qty < 0 ? `Short ${Math.abs(row.qty)}` : '—'
  const costCell = avgForPnl != null && Number.isFinite(avgForPnl) ? fmtUsd(avgForPnl) : '—'

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
      <DenseTableCell className={liveTable.symbolCell}>
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
        <strong>{contractLabel}</strong>
      </DenseTableCell>

      {hasStreamAccounts && (
        <>
          <DenseTableCell className={denseTableNumCell}>{isHost ? qtyCell : '—'}</DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>{isHost ? costCell : '—'}</DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>
            {isHost && livePnl != null ? (
              <InlinePnl value={livePnl}>{fmtUsd(livePnl, true)}</InlinePnl>
            ) : (
              '—'
            )}
          </DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>{isSecondary ? qtyCell : '—'}</DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>{isSecondary ? costCell : '—'}</DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>
            {isSecondary && livePnl != null ? (
              <InlinePnl value={livePnl}>{fmtUsd(livePnl, true)}</InlinePnl>
            ) : (
              '—'
            )}
          </DenseTableCell>
        </>
      )}

      <DenseTableCell>{qtyCell}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{costCell}</DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, liveTable.lastBidAsk)}>
        {quote ? (
          <>
            {mid != null ? fmtUsd(mid) : '—'}
            {quote.bid != null && quote.ask != null && (
              <span className={liveTable.bidAskSpread}>
                {' '}
                {quote.bid.toFixed(2)}/{quote.ask.toFixed(2)}
              </span>
            )}
          </>
        ) : (
          '—'
        )}
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
      <DenseTableCell className={denseTableNumCell} title={mtmTooltip}>
        {livePnl != null ? (
          <InlinePnl value={livePnl}>{fmtUsd(livePnl, true)}</InlinePnl>
        ) : (
          '—'
        )}
      </DenseTableCell>
    </tr>
  )
}
