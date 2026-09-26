/**
 * The Chain face's arithmetic (design `Research Symbol.dc.html`, §isOptions):
 * expiry cards off the fit's own ATM vols, the chain strip's readings — ±1σ,
 * straddle, max pain, put/call — computed from the snapshot rows themselves,
 * and the strike ladder that puts puts left, calls right, Δ always beside
 * the strike.
 */
import type { ChainContract } from '@/utils/optionChain'

export function sigmaMove(spot: number, ivFrac: number, dte: number): number {
  return spot * ivFrac * Math.sqrt(Math.max(1, dte) / 365)
}

/** The two nearest-the-money marks, summed — the priced move. */
export function straddleMid(chain: readonly ChainContract[], spot: number): number | null {
  const strikes = [...new Set(chain.map((c) => c.strike))]
  if (strikes.length === 0) return null
  const atm = strikes.reduce((a, b) => (Math.abs(b - spot) < Math.abs(a - spot) ? b : a))
  const call = chain.find((c) => c.strike === atm && c.right === 'C')?.mark
  const put = chain.find((c) => c.strike === atm && c.right === 'P')?.mark
  return call != null && put != null ? call + put : null
}

/** The close that pays option holders least — sellers' favourite strike. */
export function maxPain(chain: readonly ChainContract[]): number | null {
  const strikes = [...new Set(chain.map((c) => c.strike))].sort((a, b) => a - b)
  if (strikes.length === 0) return null
  let best: number | null = null
  let bestPay = Infinity
  for (const s of strikes) {
    let pay = 0
    for (const c of chain) {
      if (c.oi == null) continue
      const intrinsic = c.right === 'C' ? Math.max(0, s - c.strike) : Math.max(0, c.strike - s)
      pay += intrinsic * c.oi
    }
    if (pay < bestPay) {
      bestPay = pay
      best = s
    }
  }
  return best
}

export function oiTotals(chain: readonly ChainContract[]): {
  total: number
  calls: number
  puts: number
  pc: number | null
} {
  let calls = 0
  let puts = 0
  for (const c of chain) {
    if (c.oi == null) continue
    if (c.right === 'C') calls += c.oi
    else puts += c.oi
  }
  return { total: calls + puts, calls, puts, pc: calls > 0 ? puts / calls : null }
}

export type LadderColumnSet = 'marks' | 'greeks' | 'analytics'

/** Column labels, outermost first; Δ is always the innermost, by design. */
export const LADDER_COLUMNS: Record<LadderColumnSet, [string, string, string, string]> = {
  marks: ['OI', 'Vol', 'Mark', 'Δ'],
  greeks: ['Vega', 'Θ', 'Γ', 'Δ'],
  analytics: ['OI', 'IV', 'vs fit', 'Δ'],
}

export interface LadderCell {
  contract: ChainContract
  /** Outermost → innermost, matching LADDER_COLUMNS. */
  values: [string, string, string, string]
}

export interface LadderRow {
  strike: number
  moneyPct: number
  atm: boolean
  put: LadderCell | null
  call: LadderCell | null
}

function fmtCell(v: number | null | undefined, digits = 2): string {
  return v == null ? '—' : v.toFixed(digits)
}

function cellsFor(
  c: ChainContract,
  set: LadderColumnSet,
  fitIvPts: ((k: number) => number) | null,
  spot: number,
): [string, string, string, string] {
  const delta = c.delta != null ? Math.abs(c.delta).toFixed(2) : '—'
  if (set === 'greeks') {
    return [fmtCell(c.vega), fmtCell(c.theta), fmtCell(c.gamma, 4), delta]
  }
  if (set === 'analytics') {
    const ivPts = c.iv != null ? c.iv * 100 : null
    const fit = fitIvPts && spot > 0 ? fitIvPts(Math.log(c.strike / spot)) : null
    const res = ivPts != null && fit != null ? ivPts - fit : null
    return [
      c.oi != null ? c.oi.toLocaleString('en-US') : '—',
      ivPts != null ? ivPts.toFixed(1) : '—',
      res != null ? `${res >= 0 ? '+' : '−'}${Math.abs(res).toFixed(1)}` : '—',
      delta,
    ]
  }
  return [
    c.oi != null ? c.oi.toLocaleString('en-US') : '—',
    c.volume != null ? c.volume.toLocaleString('en-US') : '—',
    fmtCell(c.mark),
    delta,
  ]
}

export function ladderRows(
  chain: readonly ChainContract[],
  spot: number,
  window: number,
  set: LadderColumnSet,
  fitIvPts: ((k: number) => number) | null,
): LadderRow[] {
  const strikes = [...new Set(chain.map((c) => c.strike))].sort((a, b) => a - b)
  if (strikes.length === 0 || spot <= 0) return []
  const atm = strikes.reduce((a, b) => (Math.abs(b - spot) < Math.abs(a - spot) ? b : a))
  const atmIdx = strikes.indexOf(atm)
  const lo = Math.max(0, atmIdx - window)
  const hi = Math.min(strikes.length - 1, atmIdx + window)
  return strikes.slice(lo, hi + 1).map((strike) => {
    const put = chain.find((c) => c.strike === strike && c.right === 'P') ?? null
    const call = chain.find((c) => c.strike === strike && c.right === 'C') ?? null
    return {
      strike,
      moneyPct: (strike / spot - 1) * 100,
      atm: strike === atm,
      put: put ? { contract: put, values: cellsFor(put, set, fitIvPts, spot) } : null,
      call: call ? { contract: call, values: cellsFor(call, set, fitIvPts, spot) } : null,
    }
  })
}

/** The strike the SVI fit calls richest — the chain strip's amber chip. */
export function richToSvi(
  residuals: readonly { strike: number | null; residual: number | null }[],
): { strike: number; pts: number } | null {
  let best: { strike: number; pts: number } | null = null
  for (const r of residuals) {
    if (r.strike == null || r.residual == null) continue
    const pts = r.residual * 100
    if (best == null || pts > best.pts) best = { strike: r.strike, pts }
  }
  return best && best.pts > 0 ? best : null
}

/**
 * The expiry cards: the five nearest listed, plus the one a link handed over
 * (a Symbol-list contract row, the Dealer face's ⇢) when it is listed further
 * out — landing on the nearest instead would light the same strike on a
 * different contract. `handedMissing` when the store does not list it at all.
 *
 * ``eventDate`` is the next earnings print (Research's estimate): the first
 * listed expiry after it carries the event premium, and joins the cards when
 * it is further out than the five, so the earnings E has a card to sit on.
 */
export function cardExpiries(
  listed: readonly string[] | undefined,
  handed: string | null,
  eventDate: string | null = null,
): { expiries: string[]; handedMissing: boolean } {
  const all = listed ?? []
  const expiries = all.slice(0, 5)
  if (handed && all.includes(handed) && !expiries.includes(handed)) expiries.push(handed)
  const afterEvent = eventDate ? all.find((e) => e > eventDate) : undefined
  if (afterEvent && !expiries.includes(afterEvent)) expiries.push(afterEvent)
  expiries.sort()
  return { expiries, handedMissing: Boolean(handed && listed && !all.includes(handed)) }
}
