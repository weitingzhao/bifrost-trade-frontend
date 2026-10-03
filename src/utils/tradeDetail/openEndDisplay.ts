import { fmtTs } from '@/lib/format'
import type { Trade, Execution } from '@/types/positions'
import {
  computeTradePositionStatus,
  tradeListEndDateColumn,
  type TradePositionStatus,
} from '@/utils/tradeListMetrics'

export function computeOpenEndDisplay(
  trade: Trade | null,
  executions: Execution[],
  positionStatus?: TradePositionStatus,
) {
  const status = positionStatus ?? computeTradePositionStatus(executions)
  const endCol = tradeListEndDateColumn(executions, status)
  const openSec = trade?.opened_at_epoch ?? null
  const openLabel =
    openSec != null
      ? fmtTs(openSec)
      : trade?.opened_at
        ? fmtTs(Math.floor(new Date(trade.opened_at).getTime() / 1000))
        : '—'

  return {
    openLabel,
    endLabel: endCol.display ?? '—',
    title: endCol.cellTitle,
    status,
  }
}
