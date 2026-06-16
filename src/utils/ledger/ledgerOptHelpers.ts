import type { Execution } from '@/types/positions'
import type { OptionStockLink, OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { getContractLabelParts } from '@/lib/format'

export type LedgerOptContractLabelParts = {
  namePart: string
  rightLabel: string
  strikeStr: string
  full: string
}

/** Closed/Open Options tab Contract column (Legacy LedgerClosedOptionContractsSection parity). */
export function getLedgerOptContractLabelParts(
  g: Pick<OptExecutionGroup, 'contract_key' | 'symbol' | 'strike' | 'option_right' | 'trades'>,
): LedgerOptContractLabelParts {
  const p = getContractLabelParts(g.contract_key ?? '')
  const strikeStr =
    g.strike != null && Number.isFinite(Number(g.strike)) ? ` ${g.strike}` : ''
  const tradeSym = (g.trades?.[0]?.symbol ?? g.symbol ?? '').trim().replace(/\s+/g, ' ')
  const underlying = p.symbol || tradeSym.split(' ')[0] || ''
  const namePart = /\d{6}[CP]/i.test(tradeSym) ? tradeSym : underlying || g.contract_key || 'Contract'
  const rightLabel =
    p.rightLabel ||
    (() => {
      const r = (g.option_right ?? '').toUpperCase()
      if (r === 'C' || r === 'CALL') return 'CALL'
      if (r === 'P' || r === 'PUT') return 'PUT'
      return ''
    })()
  const full = rightLabel
    ? `${namePart} ${rightLabel}${strikeStr}`.trim()
    : namePart
  return { namePart, rightLabel, strikeStr, full }
}

export function formatLedgerOptContractLabel(
  g: Pick<OptExecutionGroup, 'contract_key' | 'symbol' | 'strike' | 'option_right' | 'trades'>,
): string {
  return getLedgerOptContractLabelParts(g).full
}

/** Ledger option group row — same shape as Positions `contractButtonLabel`. */
export function optExecutionGroupContractLabel(
  g: Pick<OptExecutionGroup, 'symbol' | 'option_right' | 'strike' | 'contract_key' | 'trades'>,
): string {
  return formatLedgerOptContractLabel(g)
}

/**
 * Sum the slippage_total from the option-stock link for one option execution.
 * Returns 0 if no link or no slippage data.
 */
/** Sum stock slippage vs close for one OPT execution id (Legacy ledgerOptHelpers parity). */
export function stockSlippageTotalForOptionExecution(
  optionExecId: number | null | undefined,
  linkByOptionId: Record<number, OptionStockLinkSummary> | undefined,
): number {
  if (optionExecId == null || !linkByOptionId) return 0
  const summary = linkByOptionId[optionExecId]
  if (!summary) return 0
  const t = summary.slippage_total
  if (t != null && Number.isFinite(t)) return t
  let total = 0
  for (const d of summary.links ?? []) {
    const s = d.slippage_vs_close
    if (s != null && Number.isFinite(s)) total += s
  }
  return total
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
    .map(r => r.link_id)
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

/** Instance id(s) on this execution: allocation rows or single strategy_instance_id. */
export function executionStrategyInstanceIds(e: Execution): number[] {
  const allocs = e.instance_allocations
  if (allocs && allocs.length > 0) {
    const out: number[] = []
    for (const a of allocs) {
      const id = a.strategy_instance_id
      if (id != null && Number.isFinite(Number(id))) {
        out.push(Number(id))
      }
    }
    if (out.length > 0) return out
  }
  if (e.strategy_instance_id != null && Number.isFinite(Number(e.strategy_instance_id))) {
    return [Number(e.strategy_instance_id)]
  }
  return []
}

/**
 * Synthetic row for one strategy_instance: allocated signed qty and pro-rata PnL/commission
 * (Legacy ledgerOptHelpers / reader weight_realized_for_strategy_instance parity).
 */
export function sliceExecutionForInstanceOptView(
  ex: Execution,
  instanceId: number,
): Execution | null {
  const allocs = ex.instance_allocations
  if (allocs && allocs.length > 0) {
    let denom = 0
    for (const a of allocs) {
      denom += Math.abs(Number(a.allocated_quantity) || 0)
    }
    if (denom <= 0) return null
    const mine = allocs.find(a => Number(a.strategy_instance_id) === instanceId)
    if (!mine) return null
    const allocQty = Number(mine.allocated_quantity)
    if (!Number.isFinite(allocQty)) return null
    const w = Math.abs(allocQty) / denom

    const rp = ex.realized_pnl
    const comm = ex.commission
    const allocOppRaw = mine.strategy_opportunity_id
    const resolvedOppId =
      allocOppRaw != null && Number.isFinite(Number(allocOppRaw))
        ? Number(allocOppRaw)
        : ex.strategy_opportunity_id != null && Number.isFinite(Number(ex.strategy_opportunity_id))
          ? Number(ex.strategy_opportunity_id)
          : null
    const parentOppNum =
      ex.strategy_opportunity_id != null && Number.isFinite(Number(ex.strategy_opportunity_id))
        ? Number(ex.strategy_opportunity_id)
        : null
    const resolvedOppName =
      resolvedOppId != null &&
      parentOppNum != null &&
      resolvedOppId === parentOppNum
        ? ex.strategy_opportunity_name?.trim() ?? null
        : null

    const taxes = ex.taxes
    const netCash = ex.net_cash

    return {
      ...ex,
      qty: allocQty,
      quantity: allocQty,
      realized_pnl:
        rp != null && Number.isFinite(Number(rp)) ? Number(rp) * w : rp,
      commission:
        comm != null && Number.isFinite(Number(comm)) ? Number(comm) * w : comm,
      taxes:
        taxes != null && Number.isFinite(Number(taxes)) ? Number(taxes) * w : taxes,
      net_cash:
        netCash != null && Number.isFinite(Number(netCash)) ? Number(netCash) * w : netCash,
      strategy_opportunity_id: resolvedOppId,
      strategy_opportunity_name: resolvedOppName,
      strategy_instance_id: instanceId,
      strategy_instance_label:
        (mine.strategy_instance_label?.trim() || ex.strategy_instance_label?.trim()) ?? null,
      instance_allocations: undefined,
    }
  }

  if (ex.strategy_instance_id === instanceId) return ex
  return null
}

/** Expand one execution into per-allocation instance rows (qty/PnL + opportunity id from allocation). */
export function expandExecutionRowsForStrategyOptView(ex: Execution): Execution[] {
  const ids = executionStrategyInstanceIds(ex)
  if (ids.length === 0) {
    return [ex]
  }
  const seen = new Set<number>()
  const out: Execution[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    const row = sliceExecutionForInstanceOptView(ex, id)
    if (row) out.push(row)
  }
  return out
}

export function groupExecutionsByStrategyInstanceId(
  trades: Execution[],
): Map<number | 'none', Execution[]> {
  const m = new Map<number | 'none', Execution[]>()
  for (const t of trades) {
    const sid = t.strategy_instance_id
    const key: number | 'none' =
      sid != null && Number.isFinite(Number(sid)) ? Number(sid) : 'none'
    const arr = m.get(key)
    if (arr) arr.push(t)
    else m.set(key, [t])
  }
  return m
}

/**
 * Closed-option group PnL: premium-based realized_pnl plus stock-leg slippage
 * (one sum per distinct account_executions_id). Legacy LedgerView parity.
 */
export function adjustedRealizedPnlForOptGroup(
  g: import('@/utils/ledger/optExecutionGroups').OptExecutionGroup,
  linkByOptionId: Record<number, OptionStockLinkSummary> | undefined,
): number {
  const base = Number(g.realized_pnl) || 0
  if (!linkByOptionId) return base
  let adj = 0
  const seen = new Set<number>()
  for (const ex of g.trades ?? []) {
    const oid = ex.account_executions_id
    if (oid == null || seen.has(oid)) continue
    seen.add(oid)
    adj += stockSlippageTotalForOptionExecution(oid, linkByOptionId)
  }
  return base + adj
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

export function collectLinkIdsForOptGroup(
  g: OptExecutionGroup,
  linkByOptionId: Record<number, OptionStockLinkSummary> | undefined,
): number[] {
  const ids = new Set<number>()
  if (!linkByOptionId) return []
  const seen = new Set<number>()
  for (const ex of g.trades ?? []) {
    const oid = ex.account_executions_id
    if (oid == null || seen.has(oid)) continue
    seen.add(oid)
    for (const row of linkByOptionId[oid]?.links ?? []) {
      if (row.link_id != null && Number.isFinite(Number(row.link_id))) {
        ids.add(Number(row.link_id))
      }
    }
  }
  return Array.from(ids).sort((a, b) => a - b)
}

export function flattenLinksForOptGroup(
  g: OptExecutionGroup,
  linkByOptionId: Record<number, OptionStockLinkSummary> | undefined,
): OptionStockLink[] {
  const byId = new Map<number, OptionStockLink>()
  if (!linkByOptionId) return []
  const seen = new Set<number>()
  for (const ex of g.trades ?? []) {
    const oid = ex.account_executions_id
    if (oid == null || seen.has(oid)) continue
    seen.add(oid)
    for (const row of linkByOptionId[oid]?.links ?? []) {
      const lid = row.link_id
      if (lid != null && !byId.has(lid)) byId.set(lid, row)
    }
  }
  return Array.from(byId.values()).sort((a, b) => (a.link_id ?? 0) - (b.link_id ?? 0))
}

export function sumLinkSlippageForOptGroup(
  g: OptExecutionGroup,
  linkByOptionId: Record<number, OptionStockLinkSummary> | undefined,
): number | null {
  if (!linkByOptionId) return null
  let s = 0
  let any = false
  const seenOid = new Set<number>()
  for (const ex of g.trades ?? []) {
    const oid = ex.account_executions_id
    if (oid == null || seenOid.has(oid)) continue
    seenOid.add(oid)
    const t = linkByOptionId[oid]?.slippage_total
    if (t != null && Number.isFinite(t)) {
      s += t
      any = true
    }
  }
  return any ? s : null
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
  if (isBuy) return ep >= 0 ? 'text-profit' : 'text-loss'
  return 'text-side-sell'
}

export function isExecutionBuySide(ex: Execution): boolean {
  const s = (ex.side ?? '').toUpperCase()
  return s === 'BUY' || s === 'BOT' || s === 'B'
}

export function executionAbsQuantity(ex: Execution): number {
  return Math.abs(Number(ex.quantity ?? ex.qty) || 0)
}

/** Sibling fills on the same option contract that already have instance attribution (Assign strategy shortcut). */
export interface PeerInstancePick {
  strategy_opportunity_id: number
  strategy_instance_id: number
  label: string
}

/** Unique (opportunity, instance) pairs from other executions in the same contract group. */
export function collectPeerInstancePicks(
  sameContractTrades: Execution[],
  currentAccountExecutionsId: number,
): PeerInstancePick[] {
  const seen = new Set<string>()
  const out: PeerInstancePick[] = []
  for (const peer of sameContractTrades) {
    const pid = peer.account_executions_id
    if (pid != null && pid === currentAccountExecutionsId) continue
    const iids = executionStrategyInstanceIds(peer)
    for (const iid of iids) {
      const sliced = sliceExecutionForInstanceOptView(peer, iid)
      const oppRaw = sliced?.strategy_opportunity_id ?? peer.strategy_opportunity_id
      if (oppRaw == null || !Number.isFinite(Number(oppRaw))) continue
      const oppId = Number(oppRaw)
      const key = `${oppId}::${iid}`
      if (seen.has(key)) continue
      seen.add(key)
      const oppName =
        (sliced?.strategy_opportunity_name?.trim() ||
          peer.strategy_opportunity_name?.trim() ||
          '') || `Opportunity #${oppId}`
      const instLab =
        (sliced?.strategy_instance_label?.trim() || peer.strategy_instance_label?.trim() || '') || ''
      const label = instLab ? `${oppName} · ${instLab} (#${iid})` : `${oppName} · #${iid}`
      out.push({ strategy_opportunity_id: oppId, strategy_instance_id: iid, label })
    }
  }
  out.sort((a, b) => a.label.localeCompare(b.label))
  return out
}

/** Opposite-side same-qty fill in group that carries strategy attribution (for sync). */
export function findOppositeLegAttributionSource(
  trades: Execution[],
  ex: Execution,
): Execution | null {
  const exId = ex.account_executions_id
  const exBuy = isExecutionBuySide(ex)
  const exQty = executionAbsQuantity(ex)
  if (exQty <= 0) return null
  const exCk = (ex.contract_key ?? '').trim()

  for (const t of trades) {
    if (exId != null && t.account_executions_id != null && t.account_executions_id === exId) continue
    if (exId == null && t === ex) continue

    const tCk = (t.contract_key ?? '').trim()
    if (exCk && tCk && exCk !== tCk) continue
    if (isExecutionBuySide(t) === exBuy) continue
    if (executionAbsQuantity(t) !== exQty) continue

    const opp = t.strategy_opportunity_id
    const instIds = executionStrategyInstanceIds(t)
    if (instIds.length !== 1) continue
    const inst = instIds[0]
    if (opp == null || !Number.isFinite(Number(opp)) || !Number.isFinite(Number(inst))) continue
    return t
  }
  return null
}
