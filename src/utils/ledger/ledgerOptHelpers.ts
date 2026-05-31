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

/**
 * PnL display for a single option execution row (full quantity).
 * option economic = signed cash flow (buy negative, sell positive) based on
 * qty * price * 100 - commission. When linked-stock data is present, adds
 * slippage adjustment.
 */
export function ledgerOptDetailRowPnl(
  ex: Execution,
  linkByOptionId: Record<number, OptionStockLinkSummary> | undefined,
): { displayPnl: number; hasCombinedStock: boolean; stockAdj: number } {
  const s = (ex.side ?? '').toUpperCase()
  const isBuy = s === 'BUY' || s === 'BOT' || s === 'B'
  const q = Number(ex.quantity ?? ex.qty) || 0
  const p = Number(ex.price) || 0
  const c = Number(ex.commission) || 0
  const value = q * p * 100 - c
  const optionEconomic = isBuy ? -value : value
  const oid = ex.account_executions_id
  const stockAdj = stockSlippageTotalForOptionExecution(oid, linkByOptionId)
  const linkCount =
    oid != null && linkByOptionId ? (linkByOptionId[oid]?.links?.length ?? 0) : 0
  const hasCombinedStock =
    oid != null && linkByOptionId != null && (linkCount > 0 || stockAdj !== 0)
  let displayPnl: number
  if (hasCombinedStock) {
    displayPnl = optionEconomic + stockAdj
  } else {
    displayPnl = !isBuy ? Math.abs(optionEconomic) : optionEconomic
  }
  return { displayPnl, hasCombinedStock, stockAdj }
}

/**
 * Same as {@link ledgerOptDetailRowPnl} but scales option cash flow and stock
 * slippage by `ratio` (e.g. matched qty / full |qty| on Performance realized
 * execution rows).
 */
export function scaledLedgerOptDetailRowPnl(
  ex: Execution,
  ratio: number,
  linkByOptionId: Record<number, OptionStockLinkSummary> | undefined,
): { displayPnl: number; hasCombinedStock: boolean } {
  if (ratio <= 0 || !Number.isFinite(ratio)) return { displayPnl: 0, hasCombinedStock: false }
  const s = (ex.side ?? '').toUpperCase()
  const isBuy = s === 'BUY' || s === 'BOT' || s === 'B'
  const q = Number(ex.quantity ?? ex.qty) || 0
  const p = Number(ex.price) || 0
  const c = Number(ex.commission) || 0
  const value = q * p * 100 - c
  const optionEconomic = isBuy ? -value : value
  const oid = ex.account_executions_id
  const slipFull = stockSlippageTotalForOptionExecution(oid, linkByOptionId)
  const linkCount = oid != null && linkByOptionId ? (linkByOptionId[oid]?.links?.length ?? 0) : 0
  const hasCombinedStock =
    oid != null && linkByOptionId != null && (linkCount > 0 || slipFull !== 0)
  if (hasCombinedStock) {
    return { displayPnl: optionEconomic * ratio + slipFull * ratio, hasCombinedStock: true }
  }
  const pnl = optionEconomic * ratio
  const displayPnl = !isBuy ? Math.abs(pnl) : pnl
  return { displayPnl, hasCombinedStock: false }
}

/**
 * Per-option-fill linked stock detail: link IDs, link rows, and total slippage.
 */
export function getOptionStockLinkDetailForExecution(
  ex: Execution,
  linkByOptionId: Record<number, OptionStockLinkSummary> | undefined,
): { linkIds: number[]; links: OptionStockLinkSummary['links']; slippageTotal: number | null } {
  const oid = ex.account_executions_id
  if (oid == null || !linkByOptionId) return { linkIds: [], links: [], slippageTotal: null }
  const s = linkByOptionId[oid]
  const links = s?.links ?? []
  if (links.length === 0) return { linkIds: [], links: [], slippageTotal: null }
  const linkIds = links
    .map((r) => (r as unknown as Record<string, unknown>).link_id as number | undefined)
    .filter((id): id is number => id != null && Number.isFinite(Number(id)))
    .sort((a, b) => a - b)
  return {
    linkIds,
    links,
    slippageTotal: s?.slippage_total ?? null,
  }
}

/**
 * Prorated sum of option–stock link slippage attributed to this strategy instance.
 * For split executions, slippage scales by (|instance qty| / |parent execution qty|).
 */
export function instanceOptionStockSlippageAdjustment(
  executionsFinalRaw: Execution[],
  strategyInstanceId: number,
  linkByOptionId: Record<number, OptionStockLinkSummary> | undefined,
): number {
  if (!linkByOptionId || Object.keys(linkByOptionId).length === 0) return 0
  let sum = 0
  for (const ex of executionsFinalRaw) {
    if ((ex.sec_type ?? '').toUpperCase() !== 'OPT') continue
    const slice = sliceExecutionForInstanceOptView(ex, strategyInstanceId)
    if (!slice) continue
    const oid = ex.account_executions_id
    if (oid == null) continue
    const parentQty = Math.abs(Number(ex.quantity ?? ex.qty) || 0)
    if (parentQty < 1e-9) continue
    const sliceQty = Math.abs(Number(slice.quantity ?? slice.qty) || 0)
    const ratio = sliceQty / parentQty
    const slip = stockSlippageTotalForOptionExecution(oid, linkByOptionId)
    if (slip !== 0) sum += slip * ratio
  }
  return sum
}

export function executionStrategyInstanceIds(e: import('@/types/positions').Execution): number[] {
  const allocs = e.instance_allocations ?? []
  if (allocs.length > 0) return allocs.map((a) => a.strategy_instance_id)
  if (e.strategy_instance_id != null) return [e.strategy_instance_id]
  return []
}

export function sliceExecutionForInstanceOptView(
  e: import('@/types/positions').Execution,
  instanceId: number,
): import('@/types/positions').Execution | null {
  const allocs = e.instance_allocations ?? []
  if (allocs.length === 0) return e.strategy_instance_id === instanceId ? e : null
  const alloc = allocs.find((a) => a.strategy_instance_id === instanceId)
  if (!alloc) return null
  const totalQty = Math.abs(Number(e.quantity ?? e.qty) || 0)
  if (totalQty <= 1e-9) return null
  const ratio = alloc.allocated_quantity / totalQty
  return {
    ...e,
    qty: e.qty * ratio,
    quantity: (e.quantity ?? e.qty) * ratio,
    strategy_instance_id: instanceId,
    strategy_instance_label: alloc.strategy_instance_label ?? e.strategy_instance_label,
    strategy_opportunity_name: alloc.strategy_opportunity_name ?? e.strategy_opportunity_name,
  }
}

export function expandExecutionRowsForStrategyOptView(
  e: import('@/types/positions').Execution,
): import('@/types/positions').Execution[] {
  const allocs = e.instance_allocations ?? []
  if (allocs.length === 0) return [e]
  const totalQty = Math.abs(Number(e.quantity ?? e.qty) || 0)
  if (totalQty <= 1e-9) return [e]
  return allocs.map((alloc) => ({
    ...e,
    qty: e.qty * (alloc.allocated_quantity / totalQty),
    quantity: (e.quantity ?? e.qty) * (alloc.allocated_quantity / totalQty),
    strategy_instance_id: alloc.strategy_instance_id,
    strategy_instance_label: alloc.strategy_instance_label ?? e.strategy_instance_label,
    strategy_opportunity_name: alloc.strategy_opportunity_name ?? e.strategy_opportunity_name,
  }))
}

export function groupExecutionsByStrategyInstanceId(
  execs: import('@/types/positions').Execution[],
): Map<number | 'none', import('@/types/positions').Execution[]> {
  const map = new Map<number | 'none', import('@/types/positions').Execution[]>()
  for (const e of execs) {
    const key: number | 'none' = e.strategy_instance_id ?? 'none'
    const arr = map.get(key) ?? []
    arr.push(e)
    map.set(key, arr)
  }
  return map
}

export function adjustedRealizedPnlForOptGroup(
  g: import('@/utils/ledger/optExecutionGroups').OptExecutionGroup,
  linkByOptionId: Record<number, OptionStockLinkSummary>,
): number {
  let stockAdj = 0
  for (const e of g.trades) {
    const oid = e.account_executions_id
    if (oid == null) continue
    stockAdj += linkByOptionId[oid]?.slippage_total ?? 0
  }
  return g.realized_pnl + stockAdj
}

/** Stable group key for an option contract group (used as expand/collapse dict key). */
export function getOptGroupKey(g: import('@/utils/ledger/optExecutionGroups').OptExecutionGroup): string {
  return `${g.contract_key}-${g.strike}-${g.expiry}`
}

/** Stable key for grouping ledger rows by strategy opportunity (null/invalid → 'none'). */
export function executionStrategyOpportunityKey(ex: Execution): number | 'none' {
  const oid = ex.strategy_opportunity_id
  if (oid != null && Number.isFinite(Number(oid))) return Number(oid)
  return 'none'
}

/** Resolved label for a specific instance on this execution. */
export function executionInstanceLabel(ex: Execution, instanceId: number): string | null {
  const allocs = ex.instance_allocations
  if (allocs && allocs.length > 0) {
    const m = allocs.find(a => a.strategy_instance_id === instanceId)
    const fromAlloc = m?.strategy_instance_label?.trim()
    if (fromAlloc) return fromAlloc
  }
  const col = ex.strategy_instance_label?.trim()
  if (ex.strategy_instance_id === instanceId && col) return col
  return null
}

/** Attribution consistency across all trades in a closed option group. */
export type InstanceConsistencyState = 'none' | 'mixed' | 'same' | 'multiple'

/**
 * 'none' = no fill has instance, 'mixed' = some do/some don't,
 * 'same' = all same single id, 'multiple' = all attributed but to different ids.
 */
export function getInstanceConsistencyState(trades: Execution[]): InstanceConsistencyState {
  if (trades.length === 0) return 'none'
  const ids: number[] = []
  for (const t of trades) ids.push(...executionStrategyInstanceIds(t))
  if (ids.length === 0) return 'none'
  const allHave = trades.every(t => executionStrategyInstanceIds(t).length > 0)
  if (!allHave) return 'mixed'
  return new Set(ids).size === 1 ? 'same' : 'multiple'
}

/**
 * PnL tone class for an execution leg in Unrealized tab.
 */
export function executionLegPnlToneClass(e: Execution, ep: number): string {
  if (Math.abs(ep) < 0.005) return ''
  const s = (e.side ?? '').toUpperCase()
  const isBuy = s === 'BUY' || s === 'BOT' || s === 'B'
  if (isBuy) return ep >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  return 'text-blue-500 dark:text-blue-400'
}
