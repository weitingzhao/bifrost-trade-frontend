/**
 * Black-Scholes for every frontend page — the one copy (TD-42). Payoff, the Symbol chain,
 * the Greeks tooltip and the option contract detail panel all read it.
 *
 * `erf` is CPython's portable algorithm (series below 1.5, continued fraction above), so
 * N(x) here matches Python's `math.erf` — and bifrost_core.pricing — to about 1e-15.
 * Before this, the two frontend copies used the Abramowitz & Stegun approximations
 * 26.2.17 (|err| ≤ 7.5e-8) and 7.1.26 (≤ 1.5e-7). `blackScholes.golden.json` (Python-side
 * values on a synthetic grid) holds the module to core.
 *
 * Two implied-vol solvers, kept apart on purpose because the pages that use them differ:
 * `impliedVolatility` (Symbol chain / Greeks tooltip: tol 1e-6, sigma floored at 1e-6) and
 * `impliedVolResearch` (contract detail panel: core's IV_RESEARCH convention).
 */

const SQRT_PI = 1.772453850905516
const ERF_SERIES_CUTOFF = 1.5
const ERF_SERIES_TERMS = 25
const ERFC_CONTFRAC_CUTOFF = 30.0
const ERFC_CONTFRAC_TERMS = 50

function erfSeries(x: number): number {
  const x2 = x * x
  let acc = 0.0
  let fk = ERF_SERIES_TERMS + 0.5
  for (let i = 0; i < ERF_SERIES_TERMS; i++) {
    acc = 2.0 + (x2 * acc) / fk
    fk -= 1.0
  }
  return (acc * x * Math.exp(-x2)) / SQRT_PI
}

function erfcContfrac(x: number): number {
  if (x >= ERFC_CONTFRAC_CUTOFF) return 0.0
  const x2 = x * x
  let a = 0.0
  let da = 0.5
  let p = 1.0
  let pLast = 0.0
  let q = da + x2
  let qLast = 1.0
  for (let i = 0; i < ERFC_CONTFRAC_TERMS; i++) {
    a += da
    da += 2.0
    const b = da + x2
    const tp = p
    p = b * p - a * pLast
    pLast = tp
    const tq = q
    q = b * q - a * qLast
    qLast = tq
  }
  return ((p / q) * x * Math.exp(-x2)) / SQRT_PI
}

/** Error function (CPython's fallback algorithm; ~1e-15 of `math.erf`). */
export function erf(x: number): number {
  if (Number.isNaN(x)) return x
  const ax = Math.abs(x)
  if (ax < ERF_SERIES_CUTOFF) return erfSeries(x)
  const cf = erfcContfrac(ax)
  return x > 0 ? 1.0 - cf : cf - 1.0
}

export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

export function normalCDF(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.SQRT2))
}

export function bsD1D2(S: number, K: number, T: number, r: number, sigma: number): [number, number] {
  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  return [d1, d1 - sigma * sqrtT]
}

function isCall(right: string): boolean {
  return right.toUpperCase() === 'C'
}

/** Call ('C') or put (anything else) price. */
export function bsPrice(S: number, K: number, T: number, r: number, sigma: number, right: string): number {
  const [d1, d2] = bsD1D2(S, K, T, r, sigma)
  const discount = Math.exp(-r * T)
  return isCall(right)
    ? S * normalCDF(d1) - K * discount * normalCDF(d2)
    : K * discount * normalCDF(-d2) - S * normalCDF(-d1)
}

/** dPrice/dSigma per unit of vol (same for calls and puts). */
export function bsVega(S: number, K: number, T: number, r: number, sigma: number): number {
  const [d1] = bsD1D2(S, K, T, r, sigma)
  return S * normalPDF(d1) * Math.sqrt(T)
}

/**
 * Implied vol, core's IV_RESEARCH convention (the api research greeks solver): discounted
 * intrinsic floor, start at 0.3, step then clamp to [0.001, 5], stop once |diff| < 1e-8,
 * accept when the final price is within max(5% of the price, 0.05).
 */
export function impliedVolResearch(
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  right: string,
  maxIter = 50,
): { iv: number | null; converged: boolean; iterCount: number } {
  if (T <= 0 || marketPrice <= 0 || S <= 0 || K <= 0) {
    return { iv: null, converged: false, iterCount: 0 }
  }
  const discount = Math.exp(-r * T)
  const intrinsic = isCall(right) ? Math.max(0, S - K * discount) : Math.max(0, K * discount - S)
  if (marketPrice < intrinsic - 1e-6) {
    return { iv: null, converged: false, iterCount: 0 }
  }
  let sigma = 0.3
  let iterCount = 0
  let converged = false
  for (let i = 0; i < maxIter; i++) {
    iterCount++
    const price = bsPrice(S, K, T, r, sigma, right)
    const vega = bsVega(S, K, T, r, sigma)
    if (vega < 1e-10) break
    const diff = price - marketPrice
    sigma -= diff / vega
    sigma = Math.max(0.001, Math.min(5.0, sigma))
    if (Math.abs(diff) < 1e-8) {
      converged = true
      break
    }
  }
  const check = bsPrice(S, K, T, r, sigma, right)
  if (Math.abs(check - marketPrice) > Math.max(0.05 * marketPrice, 0.05)) {
    return { iv: null, converged: false, iterCount }
  }
  if (sigma < 0.001 || sigma > 5.0) {
    return { iv: null, converged: false, iterCount }
  }
  return { iv: sigma, converged, iterCount }
}

export interface BsInputs {
  S: number     // underlying price
  K: number     // strike
  T: number     // time to expiry in years
  r: number     // risk-free rate (e.g. 0.05)
  sigma: number // implied volatility (e.g. 0.30)
  right: 'C' | 'P'
}

export interface BsDetail {
  d1: number
  d2: number
  Nd1: number  // N(d1) for call / N(-d1) for put
  Nd2: number  // N(d2) for call / N(-d2) for put
  delta: number
  gamma: number
  theta: number  // per calendar day
  vega: number   // per 1% change in IV
  price: number
  iv_converged: boolean
  iv_iterations: number
}

export function bsComputeDetail({ S, K, T, r, sigma, right }: BsInputs): BsDetail {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    return { d1: 0, d2: 0, Nd1: 0, Nd2: 0, delta: 0, gamma: 0, theta: 0, vega: 0, price: 0, iv_converged: false, iv_iterations: 0 }
  }
  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  const nd1 = normalPDF(d1)
  const disc = Math.exp(-r * T)

  const Nd1 = right === 'C' ? normalCDF(d1) : normalCDF(-d1)
  const Nd2 = right === 'C' ? normalCDF(d2) : normalCDF(-d2)

  const delta = right === 'C' ? normalCDF(d1) : normalCDF(d1) - 1
  const gamma = nd1 / (S * sigma * sqrtT)
  // Per calendar day. The carry term has opposite signs: a call pays −rK·e^(−rT)·N(d2),
  // a put earns +rK·e^(−rT)·N(−d2) (put-call parity: θc − θp = −rK·e^(−rT)).
  const carry = r * K * disc
  const theta = (-(S * nd1 * sigma) / (2 * sqrtT)
    + (right === 'C' ? -carry * normalCDF(d2) : carry * normalCDF(-d2))) / 365
  const vega = S * sqrtT * nd1 / 100  // per 1% vol

  const price = right === 'C'
    ? S * normalCDF(d1) - K * disc * normalCDF(d2)
    : K * disc * normalCDF(-d2) - S * normalCDF(-d1)

  return { d1, d2, Nd1, Nd2, delta, gamma, theta, vega, price, iv_converged: true, iv_iterations: 0 }
}

export function impliedVolatility(
  S: number,
  K: number,
  T: number,
  r: number,
  marketPrice: number,
  right: 'C' | 'P',
  maxIter = 100,
  tol = 1e-6,
): { sigma: number; converged: boolean; iterations: number } {
  if (T <= 0 || S <= 0 || K <= 0 || marketPrice <= 0) {
    return { sigma: 0, converged: false, iterations: 0 }
  }
  let sigma = 0.3
  for (let i = 0; i < maxIter; i++) {
    const { price, vega: v } = bsComputeDetail({ S, K, T, r, sigma, right })
    const diff = price - marketPrice
    if (Math.abs(diff) < tol) return { sigma, converged: true, iterations: i + 1 }
    const rawVega = v * 100  // undo /100
    if (Math.abs(rawVega) < 1e-10) break
    sigma -= diff / rawVega
    if (sigma <= 0) sigma = 1e-6
  }
  return { sigma, converged: false, iterations: maxIter }
}
