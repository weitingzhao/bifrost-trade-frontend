/**
 * The option contract detail panel's Black-Scholes breakdown (implied vol from the market
 * price, then each intermediate the panel prints). The math is `@/utils/blackScholes`,
 * the frontend's one copy (TD-42); this module only shapes it for the panel.
 */
import { bsPrice, impliedVolResearch, normalCDF as normCdf, normalPDF as normPdf } from '@/utils/blackScholes'

export interface BSDetail {
  inputs: {
    S: number
    K: number
    tYears: number
    tDays: number
    r: number
    right: string
    marketPrice: number
  }
  iv: number | null
  converged: boolean
  iterCount: number
  initialSigma: number
  sqrtT: number | null
  lnSK: number | null
  d1Numerator: number | null
  d1Denominator: number | null
  d1: number | null
  d2: number | null
  Nd1: number | null
  Nd2: number | null
  nd1: number | null
  delta: number | null
  gamma: number | null
  thetaPerDay: number | null
  vegaPer1Pct: number | null
  bsModelPrice: number | null
}

export function bsComputeDetail(params: {
  marketPrice: number
  S: number
  K: number
  tYears: number
  r: number
  right: string
}): BSDetail {
  const { marketPrice, S, K, tYears, r, right } = params
  const tDays = Math.round(tYears * 365)
  const inputs = { S, K, tYears, tDays, r, right, marketPrice }
  const { iv, converged, iterCount } = impliedVolResearch(marketPrice, S, K, tYears, r, right)
  if (iv == null) {
    return {
      inputs,
      iv: null,
      converged: false,
      iterCount,
      initialSigma: 0.3,
      sqrtT: null,
      lnSK: null,
      d1Numerator: null,
      d1Denominator: null,
      d1: null,
      d2: null,
      Nd1: null,
      Nd2: null,
      nd1: null,
      delta: null,
      gamma: null,
      thetaPerDay: null,
      vegaPer1Pct: null,
      bsModelPrice: null,
    }
  }
  const sqrtT = Math.sqrt(tYears)
  const lnSK = Math.log(S / K)
  const d1Numerator = lnSK + (r + 0.5 * iv * iv) * tYears
  const d1Denominator = iv * sqrtT
  const d1 = d1Numerator / d1Denominator
  const d2 = d1 - iv * sqrtT
  const Nd1 = normCdf(d1)
  const Nd2 = normCdf(d2)
  const nd1 = normPdf(d1)
  const discount = Math.exp(-r * tYears)
  const gamma = nd1 / (S * iv * sqrtT)
  let delta: number
  let thetaAnnual: number
  if (right.toUpperCase() === 'C') {
    delta = Nd1
    thetaAnnual = -(S * nd1 * iv) / (2.0 * sqrtT) - r * K * discount * Nd2
  } else {
    delta = Nd1 - 1.0
    thetaAnnual = -(S * nd1 * iv) / (2.0 * sqrtT) + r * K * discount * normCdf(-d2)
  }
  const thetaPerDay = thetaAnnual / 365.0
  const vegaPer1Pct = S * nd1 * sqrtT * 0.01
  const bsModelPrice = bsPrice(S, K, tYears, r, iv, right)
  return {
    inputs,
    iv,
    converged,
    iterCount,
    initialSigma: 0.3,
    sqrtT,
    lnSK,
    d1Numerator,
    d1Denominator,
    d1,
    d2,
    Nd1,
    Nd2,
    nd1,
    delta,
    gamma,
    thetaPerDay,
    vegaPer1Pct,
    bsModelPrice,
  }
}
