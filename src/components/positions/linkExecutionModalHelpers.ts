import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import { getContractLabelParts } from '@/lib/format'
import type { Execution, Trade, StrategyOpportunity } from '@/types/positions'
import { fillQtyShown } from '@/utils/fillQuantity'

export function formatTradeOpenedDate(si: Trade): string {
  let ms: number | null = null
  if (si.opened_at_epoch != null && Number.isFinite(si.opened_at_epoch)) {
    ms = si.opened_at_epoch * 1000
  } else if (si.opened_at?.trim()) {
    const t = Date.parse(si.opened_at)
    if (!Number.isNaN(t)) ms = t
  }
  const id = si.trade_id
  const dateStr =
    ms != null
      ? new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : ''
  const num = `#${id}`
  const label = si.label?.trim()
  if (dateStr) {
    if (label) return `${label} · ${num} ${dateStr}`
    return `${num} ${dateStr}`
  }
  return label ? `${label} · ${num}` : num
}

function todayDateStr(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}


function opportunityMentionsSymbol(o: StrategyOpportunity, sym: string): boolean {
  const name = (o.name ?? '').trim().toUpperCase()
  if (!name) return false
  if (name === sym) return true
  // "FN Cash Secured Put" / "FN · Cash Secured Put" / "FN- CSP"
  return (
    name.startsWith(`${sym} `) ||
    name.startsWith(`${sym}·`) ||
    name.startsWith(`${sym} ·`) ||
    name.startsWith(`${sym}-`)
  )
}

export function getUnderlyingSymbolFromExecution(ex?: Execution | null): string {
  const fromSym = extractUnderlyingRootSymbol(ex?.symbol)
  if (fromSym) return fromSym
  const ck = (ex?.contract_key ?? '').trim()
  if (ck) {
    const rootPart = getContractLabelParts(ck).symbol
    const fromCk = extractUnderlyingRootSymbol(rootPart)
    if (fromCk) return fromCk
  }
  return ''
}

/**
 * Primary underlying for an instance from its executions (not Opportunity.symbols[0]).
 * Prefer OPT roots; fall back to STK. Majority vote when mixed.
 */
export function primaryUnderlyingFromExecutions(executions: Execution[] | null | undefined): string {
  if (!executions?.length) return ''
  const counts = new Map<string, number>()
  const bump = (sym: string, weight: number) => {
    if (!sym) return
    counts.set(sym, (counts.get(sym) ?? 0) + weight)
  }
  for (const e of executions) {
    const root = getUnderlyingSymbolFromExecution(e)
    if (!root) continue
    const st = (e.sec_type ?? '').toUpperCase()
    bump(root, st === 'OPT' ? 3 : 1)
  }
  let best = ''
  let bestN = 0
  for (const [sym, n] of counts) {
    if (n > bestN || (n === bestN && sym < best)) {
      best = sym
      bestN = n
    }
  }
  return best
}

export function defaultOpenedAtFromExecution(ex?: Execution | null): string {
  const td = ex?.trade_date?.trim()
  if (td && /^\d{4}-\d{2}-\d{2}$/.test(td)) return td
  const ts = ex?.time != null ? Number(ex.time) : null
  if (ts != null && Number.isFinite(ts) && ts > 0) {
    const d = new Date(ts * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return todayDateStr()
}

/**
 * Assign-strategy picker: narrow opportunities to the execution underlying.
 *
 * For watchlist_stk / explicit_symbols, empty `symbols` must NOT mean "match all"
 * (that previously dumped every ticker into the Assign Strategy modal).
 */
export function filterOpportunitiesBySymbol(
  opps: StrategyOpportunity[],
  execSymbol: string | null | undefined,
): StrategyOpportunity[] {
  const sym = (execSymbol ?? '').trim().toUpperCase()
  if (!sym) return opps
  return opps.filter((o) => {
    const scopeType = (o.scope_type ?? '').trim()
    const syms = (o.symbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean)

    if (scopeType === 'explicit_symbols' || scopeType === 'watchlist_stk') {
      if (syms.length > 0) return syms.includes(sym)
      return opportunityMentionsSymbol(o, sym)
    }

    // Unscoped / unknown: prefer symbols list, else name prefix, else keep (true universal).
    if (syms.length > 0) return syms.includes(sym)
    if (opportunityMentionsSymbol(o, sym)) return true
    return !scopeType
  })
}

/** Printed after the side word, so the size alone: a sell is −|q| from api 0.3.3 (TD-30). */
export function executionQtyLabel(ex: Execution): string {
  return String(fillQtyShown(ex.quantity))
}

/** Client-side guard when API filter is applied — instances must belong to selected opportunity. */
export function filterTradesForOpportunity(
  trades: Trade[],
  opportunityId: number | null,
): Trade[] {
  if (opportunityId == null || !Number.isFinite(opportunityId)) return []
  return trades.filter((i) => i.strategy_opportunity_id === opportunityId)
}

/** Re-exported for the callers that already import it from here. */
export { extractUnderlyingRootSymbol }

/** How many trades this fill is split across (its `fill_splits`). */
export function executionSplitCount(ex: Execution | null | undefined): number {
  return ex?.fill_splits?.length ?? 0
}

/**
 * The attribution PATCH Assign strategy sends (api 0.3.0). The modal moves the
 * whole fill to one opportunity / trade, so a fill that is split across trades
 * also sends `fill_splits: []` — the split is replaced, and the modal
 * says so before Save. Without it the server refuses (409): a fill is
 * attributed one way or the other. A fill with no split sends the ids alone.
 */
export function assignAttributionPatch(
  ex: Execution | null | undefined,
  opportunityId: number,
  tradeId: number,
): {
  strategy_opportunity_id: number
  trade_id: number
  fill_splits?: []
} {
  return {
    strategy_opportunity_id: opportunityId,
    trade_id: tradeId,
    ...(executionSplitCount(ex) > 0 ? { fill_splits: [] as [] } : {}),
  }
}
