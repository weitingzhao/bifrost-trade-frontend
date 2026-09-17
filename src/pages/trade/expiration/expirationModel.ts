/**
 * What expires next, and what each leg is worth if it does.
 *
 * The page's subject is the nearest expiry the book actually holds — not "this
 * Friday", which on most days holds nothing. A leg's mark is the vendor's
 * dated close from the Golden Source, the same snapshot Positions prices its
 * Greeks from (§14.2, one source); the attribution service's own `price_mid`
 * is empty outside the session, so quoting it would make the page blank after
 * the close rather than dated.
 *
 * Three readings the design asks for have no source on this side and say so:
 * pin and flip belong to Dealer Levels, early assignment needs an ex-date feed
 * with future events, and a decision written from here would be a new write
 * path — the page links to Trade Plans instead (D10).
 */
import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import { cushionPct } from '@/utils/optionMoneyness'
import type { PositionAttribution } from '@/types/positions'

export interface ExpiryLeg {
  contractKey: string
  symbol: string
  /** `YYYYMMDD`, as the attribution service reports it. */
  expiry: string
  strike: number
  right: 'C' | 'P' | ''
  /** Signed contracts: negative is short. */
  qty: number
  /** The vendor's dated close for this contract, per share. */
  mark: number | null
  markAsOf: string | null
  /** The underlying's price, from the model service. */
  spot: number | null
  /** How far spot is from the strike, signed towards trouble for this leg. */
  cushionPct: number | null
  /** True when spot is past the strike for this right. */
  itm: boolean | null
  /** What buying the leg back would cost at the mark; negative is a credit. */
  closeCost: number | null
  instanceId: number | null
  structure: string | null
  /** The accounts holding it — one contract in two accounts is one leg to a reader. */
  accounts: string[]
}

export interface ExpiryGroup {
  expiry: string
  dte: number | null
  legs: ExpiryLeg[]
  /** Legs with no mark — counted, never summed as zero. */
  unpriced: number
  /** What closing every priced leg in the group would cost. */
  closeCost: number
  itm: number
  /** The tightest cushion in the group; null when nothing could be measured. */
  tightest: number | null
}

/** Inside this many days, a leg is the desk's business rather than the ladder's. */
export const EXPIRATION_NEAR_DAYS = 7

export const EXPIRATION_UNRECORDED = {
  pin: 'Pin and flip are Dealer Levels’ computation. That page is not built, and a second computation of the same level would disagree with it eventually.',
  assign:
    'Early assignment turns on a dividend falling before expiry. The corporate-action feed carries no future ex-date for any symbol in this book, so nothing here can say a leg is at risk — or that it is safe.',
  decide:
    'A decision written from this page would be a new write path into the plan store. It is one click away instead: the leg opens in Trade Plans, which already owns that write.',
  roll: 'A roll candidate needs a quote on the target contract. The vendor snapshot carries a dated close but no bid or ask, so a credit quoted from it would be yesterday’s, presented as today’s.',
} as const

function rightOf(a: PositionAttribution): 'C' | 'P' | '' {
  const r = (a.option_right ?? '').trim().toUpperCase()
  return r === 'C' ? 'C' : r === 'P' ? 'P' : ''
}

/**
 * One row per contract, not per account row.
 *
 * The attribution service answers per account, so a contract held in two of
 * them arrives twice. They are one leg on a desk — the same strike, the same
 * expiry, decided together — so the quantity is summed and the accounts are
 * kept, which is the part a reader still needs.
 */
export function buildExpiryLegs(input: {
  attributions: readonly PositionAttribution[]
  /** Vendor close per contract key. */
  markByKey: ReadonlyMap<string, { close: number | null; asOf: string | null }>
  spotBySymbol: ReadonlyMap<string, number | null>
}): ExpiryLeg[] {
  const byKey = new Map<string, ExpiryLeg>()
  for (const a of input.attributions) {
    if ((a.sec_type ?? '').toUpperCase() !== 'OPT') continue
    const qty = Number(a.position_qty ?? a.open_qty_est ?? 0)
    if (!Number.isFinite(qty) || qty === 0) continue
    const symbol = extractUnderlyingRootSymbol(a.symbol)
    const expiry = (a.expiry ?? '').replace(/\D/g, '').slice(0, 8)
    const strike = Number(a.strike ?? 0)
    const right = rightOf(a)
    const vendor = input.markByKey.get(a.contract_key ?? '')
    const mark = vendor?.close ?? null
    const spot = input.spotBySymbol.get(symbol) ?? null
    const cushion = cushionPct(spot, strike, right)
    const key = a.contract_key ?? `${symbol}|${expiry}|${strike}|${right}`
    const prev = byKey.get(key)
    const totalQty = (prev?.qty ?? 0) + qty
    const account = (a.account_id ?? '').trim()
    byKey.set(key, {
      contractKey: key,
      symbol,
      expiry,
      strike,
      right,
      qty: totalQty,
      mark,
      markAsOf: vendor?.asOf ?? null,
      spot,
      cushionPct: cushion,
      itm: cushion == null ? null : cushion < 0,
      // Buying back a short costs money; buying back a long returns it.
      closeCost: mark == null ? null : -totalQty * mark * 100,
      instanceId: prev?.instanceId ?? a.strategy_instance_id ?? null,
      structure: prev?.structure ?? a.structure_type ?? a.strategy_instance_label ?? null,
      accounts: account && !prev?.accounts.includes(account) ? [...(prev?.accounts ?? []), account] : (prev?.accounts ?? []),
    })
  }
  return [...byKey.values()]
}

/** Nearest expiry first — the one the desk is actually deciding about. */
export function groupByExpiry(legs: readonly ExpiryLeg[], todayIso: string): ExpiryGroup[] {
  const by = new Map<string, ExpiryGroup>()
  for (const l of legs) {
    if (!l.expiry) continue
    const g = by.get(l.expiry) ?? {
      expiry: l.expiry,
      dte: daysTo(l.expiry, todayIso),
      legs: [],
      unpriced: 0,
      closeCost: 0,
      itm: 0,
      tightest: null,
    }
    g.legs.push(l)
    if (l.mark == null) g.unpriced += 1
    else g.closeCost += l.closeCost ?? 0
    if (l.itm) g.itm += 1
    if (l.cushionPct != null && (g.tightest == null || l.cushionPct < g.tightest)) g.tightest = l.cushionPct
    by.set(l.expiry, g)
  }
  for (const g of by.values()) {
    g.legs.sort((a, b) => (a.cushionPct ?? Number.POSITIVE_INFINITY) - (b.cushionPct ?? Number.POSITIVE_INFINITY))
  }
  return [...by.values()].sort((a, b) => a.expiry.localeCompare(b.expiry))
}

/** Calendar days from today to an expiry, or null when either is unreadable. */
export function daysTo(expiry: string, todayIso: string): number | null {
  const e = expiry.replace(/\D/g, '').slice(0, 8)
  const t = todayIso.replace(/\D/g, '').slice(0, 8)
  if (e.length !== 8 || t.length !== 8) return null
  const toUtc = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)))
  return Math.round((toUtc(e) - toUtc(t)) / 86_400_000)
}
