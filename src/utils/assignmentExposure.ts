/**
 * What the book owes if every short option is assigned.
 *
 * Margin pressure says how much of the account the broker is already holding.
 * It does not say what the obligation actually is, and for a premium seller the
 * two are different questions: a cash-secured put's obligation is a fixed cash
 * number known the day it is sold, while its margin requirement moves with spot.
 *
 * The split follows what assignment actually does, not what the position is
 * called:
 *
 *   short put          you buy 100 × strike per contract — a cash obligation
 *   short call, covered you deliver shares you already hold — no cash needed
 *   short call, naked   you buy the shares at market first — unbounded, so it is
 *                       counted in contracts and never given a dollar figure
 *   long options        no obligation; excluded entirely
 *
 * Naked calls deliberately have no dollar column. Any number put there would be
 * a guess about where the underlying stops, and a finite figure beside a truly
 * unbounded one reads as the smaller risk.
 */
import { normalizeRight, type OptionLegLike } from './positionsOptionRisk'

export interface ExposureLeg extends OptionLegLike {
  underlying: string
}

export interface SymbolExposure {
  underlying: string
  /** Cash needed if every short put on this symbol is assigned. */
  putAssignmentCash: number
  shortPutContracts: number
  /** Contracts of short calls backed by held shares. */
  coveredCallContracts: number
  /** Contracts of short calls with nothing behind them — unbounded. */
  nakedCallContracts: number
  /** Shares that would have to be delivered on covered calls. */
  callDeliveryShares: number
}

export interface ExposureSummary {
  bySymbol: SymbolExposure[]
  /** Total cash required if every short put is assigned. */
  putAssignmentCash: number
  shortPutContracts: number
  coveredCallContracts: number
  nakedCallContracts: number
  /** The single symbol demanding the most assignment cash. */
  largest: SymbolExposure | null
}

const SHARES_PER_CONTRACT = 100

/**
 * Grouped by underlying, because assignment is settled per symbol and a total
 * alone hides a book where one name carries most of the obligation.
 *
 * Held shares are supplied per symbol and allocated once across that symbol's
 * short calls. Taking them per leg would let two contracts on the same underlying
 * each claim the same 100 shares and both report covered — the double-count the
 * per-instance badge already has, which must not be repeated at book level where
 * the whole point is a portfolio-wide total.
 */
export function summarizeAssignmentExposure(
  legs: readonly ExposureLeg[],
  /** Shares of the underlying held across the accounts in scope. */
  sharesOf: (underlying: string) => number,
): ExposureSummary {
  const map = new Map<string, SymbolExposure>()

  const bucket = (underlying: string): SymbolExposure => {
    let b = map.get(underlying)
    if (!b) {
      b = {
        underlying,
        putAssignmentCash: 0,
        shortPutContracts: 0,
        coveredCallContracts: 0,
        nakedCallContracts: 0,
        callDeliveryShares: 0,
      }
      map.set(underlying, b)
    }
    return b
  }

  const shortCallsBySymbol = new Map<string, number>()

  for (const leg of legs) {
    if (leg.qty >= 0) continue
    const right = normalizeRight(leg.right)
    if (right == null) continue
    if (!Number.isFinite(leg.strike) || leg.strike <= 0) continue
    const contracts = Math.abs(leg.qty)
    const symbol = leg.underlying || '—'
    const b = bucket(symbol)

    if (right === 'P') {
      b.shortPutContracts += contracts
      b.putAssignmentCash += contracts * SHARES_PER_CONTRACT * leg.strike
      continue
    }
    shortCallsBySymbol.set(symbol, (shortCallsBySymbol.get(symbol) ?? 0) + contracts)
  }

  // One allocation of the symbol's shares across all its short calls.
  for (const [symbol, contracts] of shortCallsBySymbol) {
    const b = bucket(symbol)
    const backable = Math.max(0, Math.floor((sharesOf(symbol) || 0) / SHARES_PER_CONTRACT))
    const covered = Math.min(contracts, backable)
    b.coveredCallContracts += covered
    b.nakedCallContracts += contracts - covered
    b.callDeliveryShares += covered * SHARES_PER_CONTRACT
  }

  const bySymbol = [...map.values()].sort((a, b) => b.putAssignmentCash - a.putAssignmentCash)
  const totals = bySymbol.reduce(
    (acc, s) => ({
      putAssignmentCash: acc.putAssignmentCash + s.putAssignmentCash,
      shortPutContracts: acc.shortPutContracts + s.shortPutContracts,
      coveredCallContracts: acc.coveredCallContracts + s.coveredCallContracts,
      nakedCallContracts: acc.nakedCallContracts + s.nakedCallContracts,
    }),
    { putAssignmentCash: 0, shortPutContracts: 0, coveredCallContracts: 0, nakedCallContracts: 0 },
  )

  return {
    bySymbol,
    ...totals,
    largest: bySymbol.find((s) => s.putAssignmentCash > 0) ?? null,
  }
}

/**
 * How far the assignment obligation goes into what is available to meet it.
 *
 * Measured against buying power rather than cash: a margin account funds an
 * assignment on margin, so cash alone would overstate the strain, while buying
 * power is what the account can actually reach. Above 1 the book cannot fund a
 * full assignment without selling something.
 */
export function assignmentCoverRatio(
  putAssignmentCash: number,
  buyingPower: number | null,
): number | null {
  if (buyingPower == null || !Number.isFinite(buyingPower) || buyingPower <= 0) return null
  return putAssignmentCash / buyingPower
}
