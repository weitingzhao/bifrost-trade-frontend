function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

function normalCDF(x: number): number {
  // Abramowitz & Stegun 26.2.17 — max error 7.5e-8
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const poly = t * (0.319381530
    + t * (-0.356563782
    + t * (1.781477937
    + t * (-1.821255978
    + t * 1.330274429))))
  const cdf = 1 - normalPDF(x) * poly
  return x >= 0 ? cdf : 1 - cdf
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
  const theta = (-(S * nd1 * sigma) / (2 * sqrtT)
    - r * K * disc * (right === 'C' ? normalCDF(d2) : normalCDF(-d2))) / 365
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
