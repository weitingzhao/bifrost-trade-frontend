import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'

/**
 * Sum the slippage_total from the option-stock link for one option execution.
 * Returns 0 if no link or no slippage data.
 */
export function stockSlippageTotalForOptionExecution(
  optionExecId: number | null | undefined,
  linkByOptionId: Record<number, OptionStockLinkSummary> | undefined,
): number {
  if (optionExecId == null || !linkByOptionId) return 0
  const summary = linkByOptionId[optionExecId]
  if (!summary) return 0
  return summary.slippage_total ?? 0
}

/**
 * Realized PnL = FIFO pair net PnL + pro-rata option-stock link slippage.
 *
 * For each matched execution leg, slippage is allocated by the ratio of
 * matched quantity to the execution's total quantity.
 */
export function realizedPnlFifoMatchPlusStock(
  pairNetSum: number,
  sortedExecs: Execution[],
  matchedQtyById: Map<number, number>,
  linkByOptionId: Record<number, OptionStockLinkSummary> | undefined,
): number {
  let stockAdj = 0
  let anyMatched = false

  for (const e of sortedExecs) {
    const id = e.account_executions_id
    if (id == null) continue
    const eq = Math.abs(Number(e.quantity ?? e.qty) || 0)
    if (eq <= 1e-9) continue
    const mq = matchedQtyById.get(id) ?? 0
    if (mq <= 1e-9) continue
    anyMatched = true
    stockAdj += stockSlippageTotalForOptionExecution(id, linkByOptionId) * (mq / eq)
  }

  return anyMatched ? pairNetSum + stockAdj : pairNetSum
}
