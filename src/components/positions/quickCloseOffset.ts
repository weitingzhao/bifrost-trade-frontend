import type { CreateExecutionBody, Execution } from '@/types/positions'
import { isBuySide, isSellSide } from '@/utils/instanceDetail/executionSide'

/** Signed size of one fill. IB sides are BUY/SELL (or BOT/SLD), not 'Buy'. */
export function signedFillQty(exec: Execution): number {
  const mag = Math.abs(Number(exec.quantity ?? exec.qty) || 0)
  if (!Number.isFinite(mag) || mag === 0) return 0
  if (isSellSide(exec)) return -mag
  if (isBuySide(exec)) return mag
  return 0
}

/**
 * The quantity as the API stores it: negative for a sell, like every other writer
 * (the execution form and the ledger journal). The close used to send a sell as a
 * positive size — harmless only while it could never write SELL at all.
 */
export function signedCloseQuantity(close: { side: 'BUY' | 'SELL'; quantity: number }): number {
  return close.side === 'SELL' ? -Math.abs(close.quantity) : Math.abs(close.quantity)
}

/** Offset that flattens a net position: long → SELL, short → BUY. */
export function closingFillFromNet(
  netQty: number,
): { side: 'BUY' | 'SELL'; quantity: number } | null {
  if (!Number.isFinite(netQty) || Math.abs(netQty) < 1e-9) return null
  return {
    side: netQty > 0 ? 'SELL' : 'BUY',
    quantity: Math.abs(netQty),
  }
}

/**
 * The row a quick close writes.
 *
 * Source `journal_closed`, not `manual`: the API stores a manual write beside TWS
 * rows (executions_raw_tws), outside the performance book, which reads Flex and
 * journal only — so a close written as manual never closed the position there.
 * The contract's own key goes with it, or the API builds one the stored rows do
 * not share. The strategy travels only as a pair, like the ledger journal.
 */
export function quickCloseBody(
  exec: Execution,
  close: { side: 'BUY' | 'SELL'; quantity: number },
  price: number,
  commission: number | undefined,
  nowEpoch: number,
): CreateExecutionBody {
  const body: CreateExecutionBody = {
    account_id: exec.account_id,
    time: nowEpoch,
    symbol: exec.symbol,
    sec_type: exec.sec_type as 'STK' | 'OPT',
    side: close.side,
    quantity: signedCloseQuantity(close),
    price,
    source: 'journal_closed',
    expiry: exec.expiry,
    strike: exec.strike,
    option_right: exec.option_right ?? exec.right,
    contract_key: exec.contract_key,
    commission,
    currency: 'USD',
  }
  if (exec.strategy_instance_id != null && exec.strategy_opportunity_id != null) {
    body.strategy_instance_id = exec.strategy_instance_id
    body.strategy_opportunity_id = exec.strategy_opportunity_id
  }
  return body
}
