/**
 * The Payoff face's arithmetic — what a structure on this name is worth at
 * expiry and today, across underlying prices (design `Research Symbol.dc.html`
 * `isPayoff`, route rev 2026-09-17.1).
 *
 * One payoff engine, as the Chain panel's own rule says: the expiry line and
 * its stats come from `riskProfile` (`payoffOptionsAtPrice` — the same math
 * Positions charts), never a second implementation. Black–Scholes is only for
 * what an expiry engine cannot say: the dashed *today* line, the probability
 * of profit, the scenario marks and the greeks-by-spot table — time value, at
 * the vendor's own IV per leg.
 *
 * Everything here is pure; the body feeds it one expiry's chain (EOD marks —
 * no bid/ask on the plan, and the face says so) and a selected or default leg.
 */
import { bsComputeDetail, normalCDF } from '@/utils/blackScholes'
import type { ChainContract } from '@/utils/optionChain'
import {
  adjacentStrikeStep,
  buildStructureLegs,
  structureTitle,
  wingPremiumOnChain,
  type StructureKind,
  type StructureSide,
} from '@/utils/optionDiscovery/discoveryStructure'
import {
  computeRiskProfile,
  payoffOptionsAtPrice,
  payoffStockAtPrice,
  type RiskPosition,
  type RiskProfile,
} from '@/utils/riskProfile'

/** The design's own default: the OTM put nearest |Δ| 0.30 — a seller's glance. */
export function pickDefaultLeg(
  chain: readonly ChainContract[],
  spot: number
): ChainContract | null {
  const puts = chain.filter(
    (c) =>
      c.right === 'P' &&
      c.mark != null &&
      c.strike < spot &&
      c.delta != null &&
      Math.abs(c.delta) <= 0.3
  )
  if (puts.length > 0) return puts.sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!))[0]
  return (
    chain.find((c) => c.right === 'P' && c.mark != null) ??
    chain.find((c) => c.mark != null) ??
    null
  )
}

export function legFromParams(
  chain: readonly ChainContract[],
  strike: number | null,
  right: 'C' | 'P' | null
): ChainContract | null {
  if (strike == null || right == null) return null
  return chain.find((c) => c.strike === strike && c.right === right && c.mark != null) ?? null
}

export interface PayoffStructure {
  legs: RiskPosition[]
  coveredShares: number
  unquotedWing: boolean
  title: string
  profile: RiskProfile | null
  /** IV per option leg, for the today line — the anchor leg's where the wing has none. */
  ivOf: (leg: RiskPosition) => number | null
}

export function buildPayoffStructure(
  kind: StructureKind,
  side: StructureSide,
  anchor: ChainContract,
  chain: readonly ChainContract[],
  spot: number | null
): PayoffStructure {
  const strikes = [...new Set(chain.filter((c) => c.right === anchor.right).map((c) => c.strike))]
  const stepHint = adjacentStrikeStep(strikes, anchor.strike, anchor.right)
  const { wingMid } = wingPremiumOnChain(anchor, chain, spot, stepHint)
  const built = buildStructureLegs({ row: anchor, kind, side, spot, wingMid, stepHint })
  const wing = built.legs.length > 1 ? built.legs[1].strike : null
  const profile = built.unquotedWing
    ? null
    : computeRiskProfile(built.legs, Math.abs(built.coveredShares), spot)
  const ivByKey = new Map(
    chain.filter((c) => c.iv != null).map((c) => [`${c.strike}${c.right}`, c.iv!])
  )
  return {
    legs: built.legs,
    coveredShares: built.coveredShares,
    unquotedWing: built.unquotedWing,
    title: structureTitle(kind, side, anchor, wing),
    profile,
    ivOf: (leg) => ivByKey.get(`${leg.strike}${leg.right}`) ?? anchor.iv ?? null,
  }
}

/** The whole structure's value at spot S — expiry (T = 0) or today (T years). */
export function structureValueAt(s: PayoffStructure, spot: number, S: number, T: number): number {
  if (T <= 0) {
    return payoffOptionsAtPrice(s.legs, S) + payoffStockAtPrice(s.coveredShares, spot, S)
  }
  let total = payoffStockAtPrice(s.coveredShares, spot, S)
  for (const leg of s.legs) {
    const sigma = s.ivOf(leg)
    const price =
      sigma == null
        ? leg.right === 'C'
          ? Math.max(S - leg.strike, 0)
          : Math.max(leg.strike - S, 0)
        : bsComputeDetail({ S, K: leg.strike, T, r: 0, sigma, right: leg.right as 'C' | 'P' }).price
    total += leg.qty * (price - leg.avg_cost) * 100
  }
  return total
}

export interface PayoffCurves {
  xs: number[]
  atExpiry: number[]
  today: number[]
  /** σ√T of the anchor leg — the band and probability scale. */
  sigma: number
  breakeven: number | null
  /** P(profit at expiry) under the lognormal the anchor IV implies. */
  pop: number | null
}

/** P(S_T ≤ s) under the driftless lognormal the design uses. */
function probBelow(spot: number, s: number, sigma: number): number {
  return normalCDF((Math.log(s / spot) + 0.5 * sigma * sigma) / sigma)
}

export function payoffCurves(
  s: PayoffStructure,
  spot: number,
  dte: number,
  anchorIv: number | null,
  points = 81
): PayoffCurves | null {
  if (!(spot > 0) || s.legs.length === 0) return null
  const T = Math.max(dte, 0.5) / 365
  const sigma = (anchorIv ?? 0.5) * Math.sqrt(T)
  const lo = spot * Math.exp(-3 * sigma)
  const hi = spot * Math.exp(3 * sigma)
  const xs = Array.from({ length: points }, (_, i) => lo + ((hi - lo) * i) / (points - 1))
  const atExpiry = xs.map((S) => structureValueAt(s, spot, S, 0))
  const today = xs.map((S) => structureValueAt(s, spot, S, T))
  let breakeven: number | null = null
  for (let i = 1; i < xs.length; i++) {
    if (atExpiry[i - 1] < 0 !== atExpiry[i] < 0) {
      const t = (0 - atExpiry[i - 1]) / (atExpiry[i] - atExpiry[i - 1])
      breakeven = xs[i - 1] + (xs[i] - xs[i - 1]) * t
      break
    }
  }
  const pop =
    breakeven == null
      ? atExpiry[Math.floor(points / 2)] > 0
        ? 1
        : 0
      : atExpiry[points - 1] > 0
        ? 1 - probBelow(spot, breakeven, sigma)
        : probBelow(spot, breakeven, sigma)
  return { xs, atExpiry, today, sigma, breakeven, pop }
}

export interface ScenarioRow {
  label: string
  spot: number
  /** Halfway to expiry, and at expiry — both in dollars. */
  mid: number
  atExpiry: number
  /** P of ending at or beyond this spot, toward its own side. */
  prob: number
  flat: boolean
}

/**
 * Where it lands, at the marks the band draws. The design adds two earnings
 * rows when an earnings date sits inside the expiry — this side has no forward
 * earnings date on the plan, and the face says that instead of guessing.
 */
export function scenarioRows(
  s: PayoffStructure,
  spot: number,
  dte: number,
  sigma: number
): ScenarioRow[] {
  const T = Math.max(dte, 0.5) / 365
  const marks: Array<[string, number]> = [
    ['−2σ', spot * Math.exp(-2 * sigma)],
    ['−1σ', spot * Math.exp(-sigma)],
    ['flat', spot],
    ['+1σ', spot * Math.exp(sigma)],
    ['+2σ', spot * Math.exp(2 * sigma)],
  ]
  return marks.map(([label, S]) => ({
    label,
    spot: S,
    mid: structureValueAt(s, spot, S, T / 2),
    atExpiry: structureValueAt(s, spot, S, 0),
    prob: S >= spot ? 1 - probBelow(spot, S, sigma) : probBelow(spot, S, sigma),
    flat: label === 'flat',
  }))
}

export interface GreeksAtSpot {
  spot: number
  delta: number
  gamma: number
  theta: number
  vega: number
  atSpot: boolean
}

/** Net greeks today at ±5% steps — per contract, the vendor's own convention. */
export function greeksBySpot(s: PayoffStructure, spot: number, dte: number): GreeksAtSpot[] {
  const T = Math.max(dte, 0.5) / 365
  return [-2, -1, 0, 1, 2].map((i) => {
    const S = spot * (1 + i * 0.05)
    let delta = s.coveredShares / 100
    let gamma = 0
    let theta = 0
    let vega = 0
    for (const leg of s.legs) {
      const sigma = s.ivOf(leg) ?? 0.5
      const g = bsComputeDetail({ S, K: leg.strike, T, r: 0, sigma, right: leg.right as 'C' | 'P' })
      delta += leg.qty * g.delta
      gamma += leg.qty * g.gamma
      theta += leg.qty * g.theta
      vega += leg.qty * g.vega
    }
    return { spot: S, delta, gamma, theta, vega, atSpot: i === 0 }
  })
}

/**
 * A page estimate of what the broker would hold, in the design's own formulas
 * — Reg-T-shaped, not the broker what-if, and labelled so.
 */
export function marginEstimate(
  kind: StructureKind,
  side: StructureSide,
  s: PayoffStructure,
  spot: number
): number | null {
  if (s.legs.length === 0) return null
  const credit = s.legs.reduce((a, l) => a - l.qty * l.avg_cost, 0) * 100
  const anchor = s.legs[0]
  if (kind === 'vertical') {
    const width = Math.abs(s.legs[0].strike - (s.legs[1]?.strike ?? s.legs[0].strike))
    return Math.max(0, width * 100 - credit)
  }
  if (kind === 'covered') {
    return anchor.right === 'C' ? spot * 100 : Math.max(0, anchor.strike * 100 - credit)
  }
  if (side === 'short') {
    return anchor.right === 'C' ? spot * 20 + credit : Math.max(0, anchor.strike * 100 - credit)
  }
  return Math.max(0, -credit)
}
