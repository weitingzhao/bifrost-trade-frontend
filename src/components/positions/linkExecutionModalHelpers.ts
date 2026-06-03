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

export function getUnderlyingSymbolFromExecution(ex?: Execution | null): string {
  const sym = (ex?.symbol ?? '').trim()
  if (sym) {
    const beforeSpace = sym.split(/\s+/)[0]?.trim()
    if (beforeSpace) return beforeSpace.toUpperCase()
  }
  const ck = (ex?.contract_key ?? '').trim()
  if (ck) {
    const s = getContractLabelParts(ck).symbol.trim()
    if (s) return s.toUpperCase()
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

export function filterOpportunitiesBySymbol(
  opps: StrategyOpportunity[],
  execSymbol: string | null | undefined,
): StrategyOpportunity[] {
  const sym = (execSymbol ?? '').trim().toUpperCase()
  if (!sym) return opps
  return opps.filter((o) => {
    const scopeType = (o.scope_type ?? '').trim()
    if (!scopeType) return true
    if (scopeType === 'explicit_symbols') {
      const syms = (o.symbols ?? []).map((s) => s.trim().toUpperCase())
      return syms.includes(sym)
    }
    if (scopeType === 'watchlist_stk') {
      const syms = o.symbols ?? []
      if (syms.length === 0) return true
      return syms.map((s) => s.trim().toUpperCase()).includes(sym)
    }
    return true
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
