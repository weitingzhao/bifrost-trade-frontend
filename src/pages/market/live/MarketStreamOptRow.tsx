import type { QuoteItem } from '@/types/market'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import {
  computeOptMidAndLivePnl,
  describeOptionLegMtm,
  effectiveOptAvgCostPerShareForMtm,
  resolveOptAvgCostPerShareForMtm,
  type OptionLiveBasis,
} from '@/utils/optionLiveBasis'
import { optBasisKey, type OptPositionRow } from '@/utils/marketStreamsRows'
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

function pnlClass(v: number | null | undefined): string {
  if (v == null || v === 0) return ''
  return v > 0 ? styles.pnlPositive : styles.pnlNegative
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
      <td className={styles.symbolCell}>
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
      </td>

      {hasStreamAccounts && (
        <>
          <td className={styles.numCell}>{isHost ? qtyCell : '—'}</td>
          <td className={styles.numCell}>{isHost ? costCell : '—'}</td>
          <td className={cn(styles.numCell, isHost ? pnlClass(livePnl) : '')}>
            {isHost && livePnl != null ? fmtUsd(livePnl, true) : '—'}
          </td>
          <td className={styles.numCell}>{isSecondary ? qtyCell : '—'}</td>
          <td className={styles.numCell}>{isSecondary ? costCell : '—'}</td>
          <td className={cn(styles.numCell, isSecondary ? pnlClass(livePnl) : '')}>
            {isSecondary && livePnl != null ? fmtUsd(livePnl, true) : '—'}
          </td>
        </>
      )}

      <td className={styles.numCell}>{qtyCell}</td>
      <td className={styles.numCell}>{costCell}</td>
      <td className={cn(styles.numCell, styles.lastBidAsk)}>
        {quote ? (
          <>
            {mid != null ? fmtUsd(mid) : '—'}
            {quote.bid != null && quote.ask != null && (
              <span className={styles.spread}>
                {' '}
                {quote.bid.toFixed(2)}/{quote.ask.toFixed(2)}
              </span>
            )}
          </>
        ) : (
          '—'
        )}
      </td>
      <td className={styles.numCell}>—</td>
      <td className={cn(styles.numCell, pnlClass(livePnl))} title={mtmTooltip}>
        {livePnl != null ? fmtUsd(livePnl, true) : '—'}
      </td>
    </tr>
  )
}
