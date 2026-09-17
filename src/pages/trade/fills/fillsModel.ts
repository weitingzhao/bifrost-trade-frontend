/**
 * The work side of the ledger: what came back, and which fills have no home.
 *
 * The Trade Ledger is the record — every fill, reconciled, for as long as the
 * book has existed. This is the desk's window on the same fills: the last few
 * sessions, what each one is linked to, and the ones nothing claims. One
 * source, two questions.
 *
 * Nothing here sends an order. Orders are worked in TWS and this page reads
 * them (D10).
 */
import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import type { Execution } from '@/types/positions'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'

/** What claims a fill, in the order a desk would ask. */
export type FillState = 'linked' | 'orphan'

export interface FillRow {
  key: string
  /** Unix seconds; null when the source did not stamp one. */
  time: number | null
  tradeDate: string | null
  symbol: string
  contractKey: string
  secType: string
  accountId: string
  side: string
  qty: number
  price: number
  /** Always a cost, whichever sign the source reported. */
  fees: number
  /** `flex_trades`, `tws_client`, `journal_closed` — the source's own word. */
  source: string
  state: FillState
  instanceId: number | null
  instanceLabel: string | null
  opportunityName: string | null
  /** Why nothing claims it, when nothing does. */
  why: string | null
}

export interface FillsSummary {
  rows: number
  linked: number
  orphan: number
  /** Rows per source, in the source's own word. */
  bySource: { source: string; n: number }[]
  /** The newest trade date in the whole book, which is not always in the window. */
  newestTradeDate: string | null
}

export const FILLS_UNRECORDED = {
  plan:
    'No fill is linked to a plan: `strategy_plan` stores the target, the stop and the limit, but no plan on this book has reached a fill, so the column has nothing to point at.',
  order:
    'An order that filled is gone from IB’s open list the moment it fills, and nothing on this side keeps the ones that did. Today’s fills are below; today’s working orders are above; the two do not join.',
} as const

const SELL = /^(s|sell|sld)$/i

function sideWord(e: Execution): string {
  const raw = String(e.side ?? '').trim()
  if (!raw) return '—'
  return SELL.test(raw) ? 'SELL' : 'BUY'
}

function execKey(e: Execution): string {
  return `${e.account_executions_id ?? ''}|${e.exec_id ?? ''}|${e.account_id ?? ''}`
}

/**
 * Why nothing claims this fill.
 *
 * The book's own answer is the only one available: a fill with no strategy
 * instance belongs to no idea. Whether a plan exists on the symbol is worth
 * saying because it is the difference between "nobody wrote this down" and
 * "somebody did, and it never got linked".
 */
export function orphanReason(e: Execution, planSymbols: ReadonlySet<string>): string {
  const symbol = extractUnderlyingRootSymbol(e.symbol)
  if (planSymbols.has(symbol)) return `no instance · a plan exists on ${symbol}`
  return `no instance · no plan on ${symbol || 'this symbol'}`
}

export function buildFillRows(
  executions: readonly Execution[],
  plans: readonly StrategyPlan[] = [],
): FillRow[] {
  const planSymbols = new Set(plans.map((p) => (p.symbol ?? '').trim().toUpperCase()).filter(Boolean))
  return executions
    .map((e) => {
      const linked = e.strategy_instance_id != null
      return {
        key: execKey(e),
        time: e.time ?? null,
        tradeDate: e.trade_date ?? null,
        symbol: extractUnderlyingRootSymbol(e.symbol),
        contractKey: e.contract_key ?? '',
        secType: (e.sec_type ?? '').toUpperCase(),
        accountId: (e.account_id ?? '').trim(),
        side: sideWord(e),
        qty: Math.abs(Number(e.quantity ?? e.qty ?? 0)) || 0,
        price: Number(e.price) || 0,
        // Sources disagree on the sign of a commission; it is a cost either way.
        fees: Math.abs(Number(e.commission) || 0),
        source: (e.source ?? '').trim() || 'unknown',
        state: (linked ? 'linked' : 'orphan') as FillState,
        instanceId: e.strategy_instance_id ?? null,
        instanceLabel: e.strategy_instance_label ?? null,
        opportunityName: e.strategy_opportunity_name ?? null,
        why: linked ? null : orphanReason(e, planSymbols),
      }
    })
    .sort((a, b) => (b.time ?? 0) - (a.time ?? 0) || a.key.localeCompare(b.key))
}

/** Fills on or after this many days back, by the trade date the source stamped. */
export function scopeFills(rows: readonly FillRow[], days: number | null, todayIso: string): FillRow[] {
  if (days == null) return [...rows]
  const t = Date.parse(`${todayIso}T00:00:00Z`)
  if (!Number.isFinite(t)) return [...rows]
  const floor = new Date(t - days * 86_400_000).toISOString().slice(0, 10)
  return rows.filter((r) => (r.tradeDate ?? '') >= floor)
}

export function summarize(scoped: readonly FillRow[], all: readonly FillRow[]): FillsSummary {
  const bySource = new Map<string, number>()
  let linked = 0
  for (const r of scoped) {
    bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1)
    if (r.state === 'linked') linked += 1
  }
  let newest: string | null = null
  for (const r of all) {
    if (r.tradeDate && (newest == null || r.tradeDate > newest)) newest = r.tradeDate
  }
  return {
    rows: scoped.length,
    linked,
    orphan: scoped.length - linked,
    bySource: [...bySource.entries()]
      .map(([source, n]) => ({ source, n }))
      .sort((a, b) => b.n - a.n),
    newestTradeDate: newest,
  }
}

export interface PlanRow {
  id: number
  symbol: string
  structure: string | null
  status: string
  /** What the plan says to take: the target and the stop, in the store's own words. */
  target: string | null
  stop: string | null
  limit: number | null
  accountId: string
  /** True once the plan has a fill behind it — none does yet on this book. */
  filled: boolean
}

/** The plans waiting, newest intent first. A cancelled plan stays: it is still a thing that was written. */
export function buildPlanRows(plans: readonly StrategyPlan[]): PlanRow[] {
  return plans
    .map((p) => ({
      id: p.strategy_plan_id,
      symbol: (p.symbol ?? '').trim().toUpperCase(),
      structure: p.structure_label ?? null,
      status: (p.effective_status ?? p.status ?? 'unknown').trim(),
      target: p.target_kind ? `${p.target_kind} ${p.target_value ?? ''}`.trim() : null,
      stop: p.stop_kind ? `${p.stop_kind} ${p.stop_value ?? ''}`.trim() : null,
      limit: p.limit_price == null ? null : Number(p.limit_price),
      accountId: (p.account_id ?? '').trim(),
      filled: p.filled_at != null,
    }))
    .sort((a, b) => b.id - a.id)
}
