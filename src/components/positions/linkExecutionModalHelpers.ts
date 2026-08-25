import { getContractLabelParts } from '@/lib/format'
import type { Execution, StrategyInstance, StrategyOpportunity } from '@/types/positions'

export function formatInstanceOpenedDate(si: StrategyInstance): string {
  let ms: number | null = null
  if (si.opened_at_epoch != null && Number.isFinite(si.opened_at_epoch)) {
    ms = si.opened_at_epoch * 1000
  } else if (si.opened_at?.trim()) {
    const t = Date.parse(si.opened_at)
    if (!Number.isNaN(t)) ms = t
  }
  const id = si.strategy_instance_id
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

/**
 * OCC equity root is left-justified (often space-padded) before YYMMDD + C/P + strike.
 * Examples: "FN    261016P00350000", "GOOG  261120C00370000"
 */
export function extractUnderlyingRootSymbol(raw: string | null | undefined): string {
  const s = (raw ?? '').trim()
  if (!s) return ''
  const occ = s.match(/^([A-Za-z][A-Za-z0-9.]{0,9}?)\s+\d{6}[CPcp]/)
  if (occ?.[1]) return occ[1].toUpperCase()
  const beforeSpace = s.split(/\s+/)[0]?.trim()
  if (beforeSpace && /^[A-Za-z][A-Za-z0-9.]{0,9}$/.test(beforeSpace)) {
    return beforeSpace.toUpperCase()
  }
  return beforeSpace ? beforeSpace.toUpperCase() : ''
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

export function executionQtyLabel(ex: Execution): string {
  const q = ex.quantity ?? ex.qty
  return q != null ? String(q) : '—'
}

/** Client-side guard when API filter is applied — instances must belong to selected opportunity. */
export function filterInstancesForOpportunity(
  instances: StrategyInstance[],
  opportunityId: number | null,
): StrategyInstance[] {
  if (opportunityId == null || !Number.isFinite(opportunityId)) return []
  return instances.filter((i) => i.strategy_opportunity_id === opportunityId)
}
