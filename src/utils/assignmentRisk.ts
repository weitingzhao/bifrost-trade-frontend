/**
 * What can be exercised against you, and what the book becomes if it is.
 *
 * Only short legs can be assigned, so only short legs are here. For each one
 * the page can say three true things: how far spot is from the strike, how much
 * of the price is still time value — the thing a holder gives up by exercising
 * early — and what the position turns into if it happens.
 *
 * The fourth thing, *when*, it cannot say. Early assignment on a call turns on
 * a dividend landing before expiry, and the corporate-action feed carries no
 * future ex-date for any symbol in this book. So the page shows what is at
 * stake and marks the trigger, rather than implying a leg is safe.
 *
 * `|Δ|` is the vendor's delta, read as the market's own rough odds of finishing
 * in the money. It is a convention, not a probability this page computes, and
 * the page says so.
 */
import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import { cushionPct, extrinsicValue, intrinsicValue, type OptionRight } from '@/utils/optionMoneyness'
import type { PositionAttribution } from '@/types/positions'

export interface AssignmentLeg {
  contractKey: string
  symbol: string
  expiry: string
  strike: number
  right: OptionRight
  /** Contracts short, as a positive count. */
  contracts: number
  dte: number | null
  spot: number | null
  mark: number | null
  intrinsic: number | null
  /** What a holder gives up by exercising now — the number that decides whether they do. */
  extrinsic: number | null
  cushionPct: number | null
  itm: boolean | null
  /** The vendor's |Δ|, the market's own rough odds it finishes in the money. */
  absDelta: number | null
  /** Shares the assignment would move: positive is acquired, negative called away. */
  sharesAfter: number
  /** Cash it would move: negative is paid out. */
  cashAfter: number
  /**
   * The vendor's own two readings disagree about this leg.
   *
   * Delta and moneyness answer the same question from different directions, so
   * a leg that is out of the money with a delta past 0.5 — or in the money with
   * one under it — means the snapshot priced the contract against an underlying
   * the spot no longer agrees with. Measured on DEV: thin contracts with a
   * day volume of 1 carry closes and deltas that cannot both be true.
   */
  deltaDisagrees: boolean
}

export interface AssignmentTotals {
  legs: number
  itm: number
  sharesIn: number
  sharesOut: number
  /** What assignment of every in-the-money leg would cost in cash. */
  cashIfAllItmAssign: number
  /** Legs the vendor could not price, so their extrinsic is unknown. */
  unpriced: number
  /** Legs where the vendor's delta and the spot tell different stories. */
  disagreeing: number
}

/**
 * Under this much time value left, a holder gives up little by exercising —
 * which is when an early assignment stops being unlikely.
 */
export const THIN_EXTRINSIC = 0.1

/** Either side of this, delta and moneyness should be telling the same story. */
export const DELTA_COIN_FLIP = 0.5

export const ASSIGNMENT_UNRECORDED = {
  trigger:
    'Early assignment on a short call turns on a dividend landing before expiry, compared against what is left of the leg’s time value. The corporate-action feed carries no future ex-date for any symbol in this book, so nothing here can say a leg is at risk of it — or that it is safe.',
  history:
    'The book has no assigned rows: every close in it came from a trade or a journal entry. A history of what was assigned, and what was done the Monday after, needs the broker to mark an assignment as one.',
  odds:
    '|Δ| is the vendor’s delta, read the way a desk reads it — the market’s own rough odds the leg finishes in the money. It is a convention, not a probability computed here.',
  disagree:
    'A leg marked here is one where the vendor’s delta and the spot tell different stories — out of the money with a delta past 0.5, or in it with one under. The snapshot priced that contract against an underlying the spot no longer agrees with, which on DEV happens on contracts whose day volume is 1. Neither figure is corrected: the page shows what the source says and says the source disagrees with itself.',
} as const

function rightOf(a: PositionAttribution): OptionRight {
  const r = (a.option_right ?? '').trim().toUpperCase()
  return r === 'C' ? 'C' : r === 'P' ? 'P' : ''
}

/**
 * The short legs, tightest cushion first.
 *
 * One contract held short in two accounts is one leg on a desk: the assignment
 * lands on both, and the decision is the same, so the contracts are summed.
 */
export function buildAssignmentLegs(input: {
  attributions: readonly PositionAttribution[]
  markByKey: ReadonlyMap<string, { close: number | null; asOf: string | null }>
  deltaByKey: ReadonlyMap<string, number | null>
  spotBySymbol: ReadonlyMap<string, number | null>
  dteByExpiry: (expiry: string) => number | null
}): AssignmentLeg[] {
  const byKey = new Map<string, AssignmentLeg>()
  for (const a of input.attributions) {
    if ((a.sec_type ?? '').toUpperCase() !== 'OPT') continue
    const qty = Number(a.position_qty ?? 0)
    // Only a short can be assigned; a long is exercised by its holder, who is you.
    if (!Number.isFinite(qty) || qty >= 0) continue

    const key = a.contract_key ?? ''
    const symbol = extractUnderlyingRootSymbol(a.symbol)
    const strike = Number(a.strike ?? 0)
    const right = rightOf(a)
    const spot = input.spotBySymbol.get(symbol) ?? null
    const mark = input.markByKey.get(key)?.close ?? null
    const contracts = (byKey.get(key)?.contracts ?? 0) + Math.abs(qty)
    const cushion = cushionPct(spot, strike, right)
    const shares = right === 'P' ? contracts * 100 : -contracts * 100
    byKey.set(key, {
      contractKey: key,
      symbol,
      expiry: (a.expiry ?? '').replace(/\D/g, '').slice(0, 8),
      strike,
      right,
      contracts,
      dte: input.dteByExpiry(a.expiry ?? ''),
      spot,
      mark,
      intrinsic: intrinsicValue(spot, strike, right),
      extrinsic: extrinsicValue(mark, spot, strike, right),
      cushionPct: cushion,
      itm: cushion == null ? null : cushion < 0,
      absDelta: (() => {
        const d = input.deltaByKey.get(key)
        return d == null ? null : Math.abs(d)
      })(),
      sharesAfter: shares,
      // A put assigned buys the shares at the strike; a call assigned sells them.
      cashAfter: right === 'P' ? -contracts * strike * 100 : contracts * strike * 100,
      deltaDisagrees: (() => {
        const d = input.deltaByKey.get(key)
        if (d == null || cushion == null) return false
        const abs = Math.abs(d)
        return cushion < 0 ? abs < DELTA_COIN_FLIP : abs > DELTA_COIN_FLIP
      })(),
    })
  }
  return [...byKey.values()].sort(
    (a, b) => (a.cushionPct ?? Number.POSITIVE_INFINITY) - (b.cushionPct ?? Number.POSITIVE_INFINITY),
  )
}

/** What the book becomes if every in-the-money leg is assigned. */
export function assignmentTotals(legs: readonly AssignmentLeg[]): AssignmentTotals {
  let sharesIn = 0
  let sharesOut = 0
  let cash = 0
  let itm = 0
  let unpriced = 0
  let disagreeing = 0
  for (const l of legs) {
    if (l.mark == null) unpriced += 1
    if (l.deltaDisagrees) disagreeing += 1
    if (!l.itm) continue
    itm += 1
    if (l.sharesAfter > 0) sharesIn += l.sharesAfter
    else sharesOut += -l.sharesAfter
    cash += l.cashAfter
  }
  return { legs: legs.length, itm, sharesIn, sharesOut, cashIfAllItmAssign: cash, unpriced, disagreeing }
}

/** Legs whose time value is thin enough that exercising costs the holder little. */
export function thinExtrinsic(legs: readonly AssignmentLeg[], floor: number = THIN_EXTRINSIC): AssignmentLeg[] {
  return legs.filter((l) => l.extrinsic != null && l.extrinsic <= floor)
}
