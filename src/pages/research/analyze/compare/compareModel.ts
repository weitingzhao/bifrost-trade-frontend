/**
 * Compare — one view, the structures your rules allow, side by side.
 *
 * Built 2026-09-23 against `Research Compare.dc.html` (Rev 2026-09-23.24) on
 * the design's option (b) for the three inputs this data plan does not carry,
 * and on the Owner's answer to where the structures come from.
 *
 * ## Where the rows come from (Owner 2026-09-23)
 *
 * The prototype's view reads "from Symbol verdict". Verdicts here are prose
 * claims with no stance, level or horizon, so the view is typed on this page
 * and says it is. The structures are the active ones in Trade › Rules whose
 * dimensions match the stance — the book's own rulebook, not a list invented
 * for the page — placed on the listed chain at the view's levels. A structure
 * the rules do not carry (the prototype's calendar and 1×2 ratio) does not
 * appear; one that cannot be placed stays as a row and says why.
 *
 * ## What is measured and what is owed (Rev .24's table)
 *
 * ```
 * legs · net · backing · Greeks · payoff     built — EOD chain snapshot
 * backing cap                                built — room to the 85% gate
 * conviction cap                             half — by structure, regime owed
 * tail cap · POP · EV · p10                  owed — no 20-day distribution
 * fills · slip · EV net                      owed — no quotes on the plan
 * ```
 *
 * Premiums are the session's last trade (`day_close`) from the end-of-day
 * snapshot, because the plan carries no bid or ask. The page says so beside
 * the number; it is the reason the fills block is owed.
 */
import type { StrategyStructure, WinRateStructureRow } from '@/types/strategy'
import { positionGreek } from '@/utils/optionTicker'
import { winRateBand } from '@/utils/reviewTrades'
import { ALLOWANCE_SHARE, sizeCapFor, type SizeCap } from '@/utils/sizeCap'

const SHARES = 100

// ── the view ──────────────────────────────────────────────────────────────

export type Stance = 'sell-vol' | 'bullish' | 'bearish' | 'buy-vol'

export const STANCES: readonly { value: Stance; label: string; matches: (s: StrategyStructure) => boolean }[] = [
  { value: 'sell-vol', label: 'sell vol', matches: (s) => s.dim_volatility === 'short_vol' },
  { value: 'bullish', label: 'bullish', matches: (s) => s.dim_direction === 'bullish' },
  { value: 'bearish', label: 'bearish', matches: (s) => s.dim_direction === 'bearish' },
  { value: 'buy-vol', label: 'buy vol', matches: (s) => s.dim_volatility === 'long_vol' },
]

export interface View {
  stance: Stance
  /** The level a short put must not be above. */
  floor: number | null
  /** The level a short call must not be below. */
  ceiling: number | null
  /** Calendar days the view is about. */
  horizon: number
}

export const DEFAULT_HORIZON = 20

/** A positive number from an address parameter, or null. */
function positiveParam(v: string | null): number | null {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function viewFromParams(p: URLSearchParams): View {
  const stance = STANCES.find((s) => s.value === p.get('stance'))?.value ?? 'sell-vol'
  const h = positiveParam(p.get('h'))
  return { stance, floor: positiveParam(p.get('floor')), ceiling: positiveParam(p.get('ceil')), horizon: h == null ? DEFAULT_HORIZON : Math.round(h) }
}

/** The structures in the rulebook a stance reads — active ones only. */
export function structuresFor(all: readonly StrategyStructure[], stance: Stance): StrategyStructure[] {
  const rule = STANCES.find((s) => s.value === stance)!
  return all.filter((s) => s.is_active && rule.matches(s))
}

// ── the chain ─────────────────────────────────────────────────────────────

// The chain helpers moved to `utils/optionChain` when the Payoff face became
// their second reader (§14.2); re-exported so this page's own vocabulary — and
// its tests — keep one import path.
export { chainFromSnapshots, isMonthly, pickExpiry } from '@/utils/optionChain'
export type { ChainContract } from '@/utils/optionChain'
import type { ChainContract } from '@/utils/optionChain'

function strikes(chain: readonly ChainContract[], right: 'C' | 'P'): number[] {
  return [...new Set(chain.filter((c) => c.right === right).map((c) => c.strike))].sort((a, b) => a - b)
}
const atOrBelow = (ks: readonly number[], x: number) => [...ks].reverse().find((k) => k <= x + 1e-9) ?? null
const atOrAbove = (ks: readonly number[], x: number) => ks.find((k) => k >= x - 1e-9) ?? null
const nearest = (ks: readonly number[], x: number) =>
  ks.length === 0 ? null : ks.reduce((best, k) => (Math.abs(k - x) < Math.abs(best - x) ? k : best))

// ── placing a rule on the chain ───────────────────────────────────────────

/**
 * A spread's long wing sits about this far beyond its short strike. The
 * rulebook's legs carry no strike rule for the wing, and the design's own
 * example (137.5 / 125 at 156.90) is about eight points of spot; five percent
 * is the narrower, more common width. Named here so the page can say it.
 */
export const WING_PCT = 0.05

/** Covered call's out-of-the-money distance when the rule itself does not say. */
export const DEFAULT_OTM_PCT = 10

export interface PlacedLeg {
  side: 'short' | 'long'
  /** `S` is the hundred shares a covered call is written against. */
  right: 'C' | 'P' | 'S'
  strike: number | null
  qty: number
  contract: ChainContract | null
}

export type Placement =
  | { ok: true; type: string; expiry: string; legs: PlacedLeg[] }
  | { ok: false; type: string; reason: string }

function leg(chain: readonly ChainContract[], side: 'short' | 'long', right: 'C' | 'P', strike: number): PlacedLeg {
  return { side, right, strike, qty: 1, contract: chain.find((c) => c.right === right && c.strike === strike) ?? null }
}

export function placeStructure(
  s: StrategyStructure,
  view: View,
  chain: readonly ChainContract[],
  spot: number,
  expiry: string,
): Placement {
  const type = s.structure_type ?? ''
  const puts = strikes(chain, 'P')
  const calls = strikes(chain, 'C')
  const fail = (reason: string): Placement => ({ ok: false, type, reason })
  const needFloor = () => fail('needs a floor — the view has none')
  const needCeiling = () => fail('needs a ceiling — the view has none')

  const shortPut = () => (view.floor == null ? null : atOrBelow(puts, view.floor))
  const putWing = (k: number) => {
    const w = atOrBelow(puts, k * (1 - WING_PCT))
    return w != null && w < k ? w : null
  }
  const shortCall = () => (view.ceiling == null ? null : atOrAbove(calls, view.ceiling))
  const callWing = (k: number) => {
    const w = atOrAbove(calls, k * (1 + WING_PCT))
    return w != null && w > k ? w : null
  }
  const ok = (legs: PlacedLeg[]): Placement => ({ ok: true, type, expiry, legs })

  switch (type) {
    case 'cash_secured_put': {
      if (view.floor == null) return needFloor()
      const k = shortPut()
      return k == null ? fail(`no listed put at or below ${view.floor}`) : ok([leg(chain, 'short', 'P', k)])
    }
    case 'bull_put_spread': {
      if (view.floor == null) return needFloor()
      const k = shortPut()
      const w = k == null ? null : putWing(k)
      return k == null || w == null
        ? fail(`no listed put pair at or below ${view.floor}`)
        : ok([leg(chain, 'short', 'P', k), leg(chain, 'long', 'P', w)])
    }
    case 'bear_call_spread': {
      if (view.ceiling == null) return needCeiling()
      const k = shortCall()
      const w = k == null ? null : callWing(k)
      return k == null || w == null
        ? fail(`no listed call pair at or above ${view.ceiling}`)
        : ok([leg(chain, 'short', 'C', k), leg(chain, 'long', 'C', w)])
    }
    case 'iron_condor': {
      if (view.floor == null) return needFloor()
      if (view.ceiling == null) return needCeiling()
      const kp = shortPut()
      const wp = kp == null ? null : putWing(kp)
      const kc = shortCall()
      const wc = kc == null ? null : callWing(kc)
      if (kp == null || wp == null || kc == null || wc == null) return fail('no listed strikes for all four legs at these levels')
      return ok([leg(chain, 'long', 'P', wp), leg(chain, 'short', 'P', kp), leg(chain, 'short', 'C', kc), leg(chain, 'long', 'C', wc)])
    }
    case 'covered_call':
    case 'covered_call_otm': {
      const otm = Number(s.metadata?.otm_pct ?? DEFAULT_OTM_PCT)
      const k = atOrAbove(calls, spot * (1 + (Number.isFinite(otm) ? otm : DEFAULT_OTM_PCT) / 100))
      if (k == null) return fail(`no listed call ${otm}% out of the money`)
      return ok([{ side: 'long', right: 'S', strike: null, qty: SHARES, contract: null }, leg(chain, 'short', 'C', k)])
    }
    case 'bull_call_spread': {
      if (view.ceiling == null) return needCeiling()
      const lk = nearest(calls, spot)
      const sk = shortCall()
      return lk == null || sk == null || sk <= lk
        ? fail(`no listed call above the money at or above ${view.ceiling}`)
        : ok([leg(chain, 'long', 'C', lk), leg(chain, 'short', 'C', sk)])
    }
    default:
      return fail(`no placement rule for ${type || 'this structure'} yet`)
  }
}

// ── one unit's economics ──────────────────────────────────────────────────

export interface Economics {
  /** Premium in minus premium out, one unit, dollars. Credit is positive. */
  net: number | null
  /** What one unit takes from the backing pool — the gauge the gate reads. */
  backing: number | null
  /** Share-equivalent delta, dollar vega per vol point, dollar theta per day. */
  delta: number | null
  vega: number | null
  theta: number | null
  /** Legs with no trade in the session, so no mark. */
  unpriced: number
}

function sum(xs: readonly (number | null)[]): number | null {
  return xs.some((x) => x == null) ? null : xs.reduce<number>((a, x) => a + (x as number), 0)
}

/**
 * What one unit costs the backing pool. The pool is Backing & Model's: cash
 * behind a short put at its strike, the width behind a defined-risk spread,
 * the shares behind a covered call, the debit behind a debit spread. That is
 * the unit the 85% gate divides, so it is the unit the cap divides too — not
 * the broker's Reg T margin, which is a different and smaller number.
 */
function backingFor(p: Extract<Placement, { ok: true }>, net: number | null, spot: number): number | null {
  const k = (right: 'C' | 'P', side: 'short' | 'long') => p.legs.find((l) => l.right === right && l.side === side)?.strike ?? null
  switch (p.type) {
    case 'cash_secured_put': {
      const s = k('P', 'short')
      return s == null ? null : s * SHARES
    }
    case 'bull_put_spread': {
      const s = k('P', 'short')
      const l = k('P', 'long')
      return s == null || l == null ? null : (s - l) * SHARES
    }
    case 'bear_call_spread': {
      const s = k('C', 'short')
      const l = k('C', 'long')
      return s == null || l == null ? null : (l - s) * SHARES
    }
    case 'iron_condor': {
      const sp = k('P', 'short')
      const lp = k('P', 'long')
      const sc = k('C', 'short')
      const lc = k('C', 'long')
      return sp == null || lp == null || sc == null || lc == null ? null : Math.max(sp - lp, lc - sc) * SHARES
    }
    case 'covered_call':
    case 'covered_call_otm':
      return spot * SHARES
    case 'bull_call_spread':
      return net == null ? null : Math.max(0, -net)
    default:
      return null
  }
}

export function economics(p: Extract<Placement, { ok: true }>, spot: number): Economics {
  const options = p.legs.filter((l) => l.right !== 'S')
  const sign = (l: PlacedLeg) => (l.side === 'short' ? -1 : 1)
  const net = sum(options.map((l) => (l.contract?.mark == null ? null : -sign(l) * l.contract.mark * SHARES * l.qty)))
  const stock = p.legs.find((l) => l.right === 'S')
  const g = (key: 'delta' | 'vega' | 'theta') =>
    sum(options.map((l) => positionGreek(l.contract?.[key] ?? null, sign(l) * l.qty)))
  const delta = g('delta')
  return {
    net,
    backing: backingFor(p, net, spot),
    delta: delta == null ? null : delta + (stock ? stock.qty : 0),
    vega: g('vega'),
    theta: g('theta'),
    unpriced: options.filter((l) => l.contract?.mark == null).length,
  }
}

/** One unit's P&L at expiry if the underlying closes at `price`, entry at the marks. */
export function payoffAt(p: Extract<Placement, { ok: true }>, spot: number, price: number): number | null {
  let total = 0
  for (const l of p.legs) {
    if (l.right === 'S') {
      total += (price - spot) * l.qty
      continue
    }
    const mark = l.contract?.mark
    if (mark == null || l.strike == null) return null
    const intrinsic = l.right === 'P' ? Math.max(l.strike - price, 0) : Math.max(price - l.strike, 0)
    total += (l.side === 'short' ? mark - intrinsic : intrinsic - mark) * SHARES * l.qty
  }
  return total
}

/** `STO 137.5P · 16 OCT @ 4.10` — the design's leg line, per leg. */
export function legLine(l: PlacedLeg, expiry: string): string {
  if (l.right === 'S') return `BUY ${l.qty} sh`
  const d = new Date(`${expiry}T12:00:00Z`)
  const date = `${String(d.getUTCDate()).padStart(2, '0')} ${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()}`
  const mark = l.contract?.mark == null ? 'no trade' : `@ ${l.contract.mark.toFixed(2)}`
  return `${l.side === 'short' ? 'STO' : 'BTO'} ${l.strike}${l.right} · ${date} ${mark}`
}

// ── the record behind conviction ──────────────────────────────────────────

export interface StructureRecord {
  name: string
  /** Instances that settled either way. */
  n: number
  wins: number
  winRate: number | null
  profitFactor: number | null
  bandLow: number
  bandHigh: number
}

/**
 * The strategy service's structure row, read the way the size-cap rule reads
 * a play: settled count, the win-rate band, gross win over gross loss. The
 * service's own figures, divided — nothing re-derived from fills.
 */
export function recordFrom(row: WinRateStructureRow): StructureRecord {
  const n = row.profit_trades + row.loss_trades
  const band = winRateBand(row.profit_trades, n)
  const loss = row.total_loss == null ? 0 : Math.abs(row.total_loss)
  return {
    name: row.structure_name,
    n,
    wins: row.profit_trades,
    winRate: n === 0 ? null : row.profit_trades / n,
    profitFactor: loss > 0 && row.total_profit != null ? row.total_profit / loss : null,
    bandLow: band.low,
    bandHigh: band.high,
  }
}

/** `Cash Secured Put · by structure: 19 closed, 95%` — written out in full, per Rev .24. */
export function recordLabel(r: StructureRecord): string {
  return `${r.name} · by structure: ${r.n} closed${r.winRate == null ? '' : `, ${Math.round(r.winRate * 100)}%`}`
}

// ── how big ───────────────────────────────────────────────────────────────

export interface Caps {
  /** Room to the backing gate over one unit's backing. */
  backing: number | null
  /** The size-cap rule's allowance on the structure's record, as a share of the backing cap. */
  conviction: number | null
  allowance: SizeCap | null
  /** Owed: needs the 20-day distribution. Always null on this plan. */
  tail: null
  /** Caps that produced a number, of the design's three. */
  computed: number
  /** The smallest computed cap — the size, before any override. */
  size: number | null
  binding: 'backing' | 'conviction' | null
}

export function capsFor(econ: Economics, spendable: number | null, record: StructureRecord | null): Caps {
  const backing =
    econ.backing != null && econ.backing > 0 && spendable != null ? Math.max(0, Math.floor(spendable / econ.backing)) : null
  const allowance = record && record.n > 0 ? sizeCapFor(record) : null
  const conviction = backing != null && allowance ? Math.floor(backing * ALLOWANCE_SHARE[allowance.label]) : null
  const computed = [backing, conviction].filter((x) => x != null).length
  let size: number | null = null
  let binding: Caps['binding'] = null
  if (backing != null) {
    size = backing
    binding = 'backing'
  }
  if (conviction != null && (size == null || conviction < size)) {
    size = conviction
    binding = 'conviction'
  }
  return { backing, conviction, allowance, tail: null, computed, size, binding }
}
