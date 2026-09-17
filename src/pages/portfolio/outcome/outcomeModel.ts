/**
 * What the book can say about a finished idea.
 *
 * An instance is closed when every option contract under it nets to zero — the
 * book stores no `closed_at`, so the fills decide. Realised is the same signed
 * cash flow the Trade Ledger shows, commissions included, summed over those
 * fills; nothing here re-prices anything.
 *
 * Two fields the prototype asks for do not exist on this side of the house: a
 * screener lens, and the run that argued for the idea. The page says so rather
 * than inventing them — see `OUTCOME_UNRECORDED`.
 */
import { ledgerOptionExecutionCashFlowSigned } from '@/utils/ledger/performanceUtils'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import type { Execution } from '@/types/positions'
import type { StrategyOpportunity } from '@/types/positions'

/** How a finished instance ended, as the fills record it. */
export type OutcomeExit = 'expired' | 'closed_early' | 'assigned' | 'unknown'

/** Where the idea came from, as far as the book knows: the opportunity's scope. */
export type OutcomeSource = 'Watchlist' | 'Chosen by hand' | 'No opportunity'

export interface OutcomeInstance {
  instanceId: number
  /** The underlyings, not the OCC strings the fills carry. */
  symbols: string[]
  /** Every contract under it, as the §14.4 token `SYM DDMMMYY strike+C/P`. */
  contracts: string[]
  accountId: string
  opportunityName: string | null
  structureName: string | null
  source: OutcomeSource
  /** Unix seconds of the first and the last fill on the instance. */
  openedAt: number | null
  closedAt: number | null
  daysHeld: number | null
  /** Signed option cash flow over every fill, commissions netted. */
  realised: number
  fills: number
  exit: OutcomeExit
}

export interface OutcomeGroup {
  key: string
  name: string
  sub: string
  n: number
  wins: number
  /** Null until the sample is big enough to read as a rate. */
  hitRate: number | null
  realised: number
  avg: number
  worst: number
}

export interface OutcomeExitBucket {
  key: OutcomeExit | 'none'
  label: string
  n: number
  realised: number
  avg: number | null
}

export interface OutcomeGap {
  what: string
  n: number
  why: string
  /** Amber when the book could answer it today; grey when nothing stores it yet. */
  tone: 'warn' | 'unknown'
  /** Where the gap is closed, when a page in this app can close it. */
  to?: string
  toLabel?: string
}

/** Under this many closes a count is a count, not a hit rate. */
export const OUTCOME_SAMPLE_FLOOR = 10

/** The two readings this page cannot make yet, and what would have to exist first. */
export const OUTCOME_UNRECORDED = {
  lens: 'No screener lens reaches a trade instance: a candidate in Research carries its lens, and nothing links that candidate to the instance that traded it.',
  run: 'No backtest run is linked to an instance either, so realised has nothing to be compared against.',
  plan: 'Trade Plans stores no entry, target or stop yet, so there is nothing an exit can be measured against.',
} as const

const SELL = /^(s|sell|sld)$/i

function fillQty(e: Execution): number {
  return Math.abs(Number(e.quantity ?? e.qty ?? 0)) || 0
}

function signedQty(e: Execution): number {
  return fillQty(e) * (SELL.test(String(e.side ?? '')) ? -1 : 1)
}

/** The underlying, off the OCC string the fills carry (`RKLB  261218C00090000`). */
function underlyingOf(e: Execution): string {
  return (e.symbol ?? '').trim().toUpperCase().split(/\s+/)[0] ?? ''
}

function isOption(e: Execution): boolean {
  return (e.sec_type ?? '').toUpperCase() === 'OPT'
}

/**
 * How it ended, from the last fill on the instance: a journal row closed the
 * book on it (expired or written off), an exchange trade bought it back, or the
 * broker assigned it. Nothing here is a stop — a stop is a plan, and plans are
 * not stored.
 */
function exitOf(last: Execution | undefined): OutcomeExit {
  if (!last) return 'unknown'
  const type = (last.transaction_type ?? '').trim().toLowerCase()
  const source = (last.source ?? '').trim().toLowerCase()
  if (type.includes('assign')) return 'assigned'
  if (type === 'booktrade' || source.includes('journal')) return 'expired'
  if (type === 'exchtrade') return 'closed_early'
  return 'unknown'
}

function sourceOf(scopeType: string | null | undefined, hasOpportunity: boolean): OutcomeSource {
  if (!hasOpportunity) return 'No opportunity'
  return (scopeType ?? '').trim() === 'watchlist_stk' ? 'Watchlist' : 'Chosen by hand'
}

export const EXIT_LABEL: Record<OutcomeExit | 'none', string> = {
  expired: 'Expired or written off',
  closed_early: 'Closed early',
  assigned: 'Assigned',
  unknown: 'Source did not say',
  none: 'No instance behind it',
}

/**
 * Closed instances, newest close first. Only option legs decide closure: a
 * covered call whose shares are still held is a closed idea, and the shares are
 * the Positions page's subject, not this one's.
 */
export function buildOutcomeInstances(input: {
  executions: readonly Execution[]
  opportunities: readonly StrategyOpportunity[]
}): OutcomeInstance[] {
  const oppById = new Map(input.opportunities.map((o) => [o.strategy_opportunity_id, o]))

  const byInstance = new Map<number, Execution[]>()
  for (const e of input.executions) {
    const id = e.strategy_instance_id
    if (id == null || !isOption(e)) continue
    const list = byInstance.get(id)
    if (list) list.push(e)
    else byInstance.set(id, [e])
  }

  const out: OutcomeInstance[] = []
  for (const [instanceId, fills] of byInstance) {
    const net = new Map<string, number>()
    for (const e of fills) net.set(e.contract_key, (net.get(e.contract_key) ?? 0) + signedQty(e))
    const stillOpen = [...net.values()].some((q) => Math.abs(q) > 1e-9)
    if (stillOpen) continue

    const sorted = [...fills].sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
    const openedAt = sorted[0]?.time ?? null
    const closedAt = sorted[sorted.length - 1]?.time ?? null
    // The fills carry the attribution themselves — the instances endpoint
    // answers per account, so asking it for the whole book returns nothing.
    const oppId = sorted.find((e) => e.strategy_opportunity_id != null)?.strategy_opportunity_id ?? null
    const opp = oppId != null ? oppById.get(oppId) : undefined
    out.push({
      instanceId,
      symbols: [...new Set(sorted.map(underlyingOf).filter(Boolean))].sort(),
      contracts: [...new Set(sorted.map((e) => shortOptContractKey(e.contract_key)))].sort(),
      accountId: sorted[0]?.account_id ?? '',
      opportunityName: sorted.find((e) => e.strategy_opportunity_name)?.strategy_opportunity_name ?? opp?.name ?? null,
      structureName: opp?.structure_name ?? null,
      source: sourceOf(opp?.scope_type, oppId != null),
      openedAt,
      closedAt,
      daysHeld: openedAt != null && closedAt != null ? Math.max(0, Math.round((closedAt - openedAt) / 86_400)) : null,
      // The ledger's own signed cash flow — this page quotes it, it does not recompute it (§14.2).
      realised: fills.reduce((sum, e) => sum + ledgerOptionExecutionCashFlowSigned(e), 0),
      fills: fills.length,
      exit: exitOf(sorted[sorted.length - 1]),
    })
  }
  return out.sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
}

/**
 * Closes since this many days back; null keeps everything. `nowSec` is the
 * window's anchor — the caller passes one in tests, and the clock is read here
 * rather than in the page, where reading it during render is a lint error and a
 * different value on every pass.
 */
export function scopeOutcome(
  rows: readonly OutcomeInstance[],
  days: number | null,
  nowSec: number = Date.now() / 1000,
): OutcomeInstance[] {
  if (days == null) return [...rows]
  const floor = nowSec - days * 86_400
  return rows.filter((r) => (r.closedAt ?? 0) >= floor)
}

/** The page's one cut: where the idea came from, as far as the book knows. */
export function cutBySource(rows: readonly OutcomeInstance[]): OutcomeGroup[] {
  const map = new Map<string, OutcomeInstance[]>()
  for (const r of rows) {
    const list = map.get(r.source)
    if (list) list.push(r)
    else map.set(r.source, [r])
  }
  const groups: OutcomeGroup[] = []
  for (const [key, list] of map) {
    const realised = list.reduce((s, r) => s + r.realised, 0)
    const wins = list.filter((r) => r.realised > 0).length
    groups.push({
      key,
      name: key,
      sub:
        key === 'Watchlist'
          ? 'the opportunity screens a watchlist'
          : key === 'Chosen by hand'
            ? 'the opportunity names its symbols'
            : 'closed on no opportunity at all',
      n: list.length,
      wins,
      hitRate: list.length >= OUTCOME_SAMPLE_FLOOR ? wins / list.length : null,
      realised,
      avg: list.length > 0 ? realised / list.length : 0,
      // The least good close in the group — not `min(…, 0)`, which printed a
      // zero the group never had when every close was a win.
      worst: list.reduce((w, r) => Math.min(w, r.realised), list[0]?.realised ?? 0),
    })
  }
  return groups.sort((a, b) => b.realised - a.realised)
}

/** How they ended, in the order the prototype lists them; empty buckets stay, as dashes. */
export function outcomeExits(rows: readonly OutcomeInstance[], unattributedCloses: number): OutcomeExitBucket[] {
  const order: (OutcomeExit | 'none')[] = ['expired', 'closed_early', 'assigned', 'unknown', 'none']
  return order.map((key) => {
    if (key === 'none') {
      return { key, label: EXIT_LABEL.none, n: unattributedCloses, realised: 0, avg: null }
    }
    const list = rows.filter((r) => r.exit === key)
    const realised = list.reduce((s, r) => s + r.realised, 0)
    return {
      key,
      label: EXIT_LABEL[key],
      n: list.length,
      realised,
      avg: list.length > 0 ? realised / list.length : null,
    }
  })
}

/**
 * Contracts that closed with no instance behind them: the money is counted, the
 * lesson is not. Counted per contract, the way the ledger links them.
 */
export function unattributedCloses(executions: readonly Execution[]): number {
  const net = new Map<string, number>()
  const seen = new Map<string, boolean>()
  for (const e of executions) {
    if (!isOption(e)) continue
    const key = `${e.account_id}|${e.contract_key}`
    net.set(key, (net.get(key) ?? 0) + signedQty(e))
    seen.set(key, (seen.get(key) ?? true) && e.strategy_instance_id == null)
  }
  let n = 0
  for (const [key, q] of net) if (Math.abs(q) < 1e-9 && seen.get(key)) n += 1
  return n
}

export function outcomeGaps(rows: readonly OutcomeInstance[], unattributed: number): OutcomeGap[] {
  return [
    {
      what: 'Closed with no instance',
      n: unattributed,
      why: 'A contract that closed on no idea — the money is counted, the lesson is not.',
      tone: unattributed > 0 ? 'warn' : 'unknown',
      to: '/portfolio/ledger',
      toLabel: 'link it → Trade Ledger',
    },
    {
      what: 'Instance with no plan',
      n: rows.length,
      why: OUTCOME_UNRECORDED.plan,
      tone: 'unknown',
      to: '/trade/plans',
      toLabel: 'Trade Plans →',
    },
    {
      what: 'Idea with no run behind it',
      n: rows.length,
      why: OUTCOME_UNRECORDED.run,
      tone: 'unknown',
      to: '/research/backtest',
      toLabel: 'Backtest →',
    },
    {
      what: 'Closed on no opportunity',
      n: rows.filter((r) => r.source === 'No opportunity').length,
      why: 'Nothing says which idea these belonged to, so no cut can place them.',
      tone: rows.some((r) => r.source === 'No opportunity') ? 'warn' : 'unknown',
    },
  ]
}
