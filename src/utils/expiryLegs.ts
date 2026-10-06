/**
 * The book's option legs as the Expiry desk reads them — one row per contract,
 * grouped by the day it expires.
 *
 * Shared because the Calendar's Expiries layer quotes the same legs on the same
 * dates (§14.2: moved out of `pages/trade/expiration` when it became the second
 * reader). The date grouping itself is `bucketByExpiry`, the one rule Events
 * and Positions also group by.
 */
import { bucketByExpiry } from '@/utils/bookCalendar'
import { extractUnderlyingRootSymbol, daysTo } from '@/utils/optionTicker'
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
  tradeId: number | null
  structure: string | null
  /** The accounts holding it — one contract in two accounts is one leg to a reader. */
  accounts: string[]
  /**
   * What the leg cost or collected at entry, in dollars for the whole leg.
   * IB's avgCost is per *contract*, not per share (the 100× trap), so no
   * ×100 here. Null when any account row arrived without one.
   */
  entryCost: number | null
  /** Position θ per day for the whole leg — positive is decay collected. */
  thetaPerDay: number | null
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

function rightOf(a: PositionAttribution): 'C' | 'P' | '' {
  const r = (a.option_right ?? '').trim().toUpperCase()
  return r === 'C' ? 'C' : r === 'P' ? 'P' : ''
}

/**
 * One row per contract, not per attribution row.
 *
 * The attribution service answers one row per *scope* — a trade-attributed
 * row per trade plus an unattributed one — and `position_qty` is
 * the whole position repeated on each of them. On DEV 2026-09-22 RKLB 18DEC26
 * 90C arrives three times carrying -26 every time, so summing every row drew a
 * -78 position that does not exist (and would have written a 78-contract draft
 * plan). Only the first row per *account* contributes the quantity; a second
 * account is a genuine addition, and those are still summed, because one
 * contract in two accounts is one leg to a reader — the same strike, the same
 * expiry, decided together — with both accounts kept.
 *
 * The per-instance split lives in `open_qty_est`, which is what the Positions
 * book flattens; this desk wants the position, not the slices.
 */
export function buildExpiryLegs(input: {
  attributions: readonly PositionAttribution[]
  /** Vendor close per contract key. */
  markByKey: ReadonlyMap<string, { close: number | null; asOf: string | null }>
  spotBySymbol: ReadonlyMap<string, number | null>
  /**
   * The vendor's θ *per share* per contract key, where it matched the leg.
   *
   * Per share rather than per position: this builder nets the quantity itself,
   * so scaling here is the only way a row's θ follows the quantity printed
   * beside it — including when two accounts hold the contract and the netted
   * quantity is larger than any one of them.
   */
  thetaPerShareByKey?: ReadonlyMap<string, number>
}): ExpiryLeg[] {
  const byKey = new Map<string, ExpiryLeg>()
  /** `contract\u0000account` already counted — see the note above. */
  const countedAccounts = new Set<string>()
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
    const account = (a.account_id ?? '').trim()
    const seen = `${key}\u0000${account}`
    const alreadyCounted = countedAccounts.has(seen)
    countedAccounts.add(seen)
    const totalQty = (prev?.qty ?? 0) + (alreadyCounted ? 0 : qty)
    // IB's avgCost is per contract, not per share — no ×100 (the 100× trap).
    const rowEntry = alreadyCounted
      ? 0
      : a.avg_cost == null
        ? null
        : Math.abs(Number(a.avg_cost)) * Math.abs(qty)
    const entryCost =
      prev === undefined
        ? rowEntry
        : prev.entryCost == null || rowEntry == null
          ? null
          : prev.entryCost + rowEntry
    const thetaPerShare = input.thetaPerShareByKey?.get(key)
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
      entryCost,
      thetaPerDay: thetaPerShare == null ? null : thetaPerShare * totalQty * 100,
      tradeId: prev?.tradeId ?? a.trade_id ?? null,
      structure: prev?.structure ?? a.structure_type ?? a.trade_label ?? null,
      accounts: account && !prev?.accounts.includes(account) ? [...(prev?.accounts ?? []), account] : (prev?.accounts ?? []),
    })
  }
  return [...byKey.values()]
}

/** Nearest expiry first — the one the desk is actually deciding about. */
export function groupByExpiry(legs: readonly ExpiryLeg[], todayIso: string): ExpiryGroup[] {
  return bucketByExpiry(legs, (l) => l.expiry).map(({ expiry, items }) => {
    const g: ExpiryGroup = {
      expiry,
      dte: daysTo(expiry, todayIso),
      legs: [...items],
      unpriced: 0,
      closeCost: 0,
      itm: 0,
      tightest: null,
    }
    for (const l of items) {
      if (l.mark == null) g.unpriced += 1
      else g.closeCost += l.closeCost ?? 0
      if (l.itm) g.itm += 1
      if (l.cushionPct != null && (g.tightest == null || l.cushionPct < g.tightest)) g.tightest = l.cushionPct
    }
    g.legs.sort((a, b) => (a.cushionPct ?? Number.POSITIVE_INFINITY) - (b.cushionPct ?? Number.POSITIVE_INFINITY))
    return g
  })
}
