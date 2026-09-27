/**
 * The Chain face's arithmetic (design `Research Symbol.dc.html`, §isOptions):
 * expiry cards off the fit's own ATM vols, the chain strip's readings — ±1σ,
 * straddle, max pain, put/call — computed from the snapshot rows themselves,
 * and the strike ladder that puts puts left, calls right, Δ always beside
 * the strike.
 */
import type { ExpectedEarnings } from '@/api/research/narrative'
import { expiryEarnings, shortDate, type ExpiryEarnings } from '@/utils/earningsEstimate'
import type { ChainContract } from '@/utils/optionChain'

/**
 * Calendar days from `today` to `expiry` (both `YYYY-MM-DD`; `today` the New
 * York date), 0 on expiration day — the count the Option screen's engine uses
 * (trade-api 86ebdf7), so the two faces read the same DTE for one contract.
 */
export function daysToExpiry(expiry: string, today: string): number {
  return Math.round((Date.parse(expiry.slice(0, 10)) - Date.parse(today)) / 86_400_000)
}

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

/**
 * Which strikes the ladder shows: a count each side of the money, every strike,
 * or the strikes within k standard deviations — k × spot × ATM IV × √(DTE/365),
 * the expiry's own priced move. The retired Discovery window called ±k × 10% of
 * spot «σ»; this one is the move the chain prices.
 */
export type StrikeWindow = { kind: 'count'; n: number } | { kind: 'all' } | { kind: 'sigma'; k: number }

export function windowStrikes(
  strikes: readonly number[],
  spot: number,
  win: StrikeWindow,
  move: number | null,
): number[] {
  const sorted = [...strikes].sort((a, b) => a - b)
  if (sorted.length === 0 || spot <= 0) return []
  if (win.kind === 'all') return sorted
  if (win.kind === 'sigma') {
    if (move == null || move <= 0) return []
    const lo = spot - win.k * move
    const hi = spot + win.k * move
    return sorted.filter((k) => k >= lo && k <= hi)
  }
  const atm = sorted.reduce((a, b) => (Math.abs(b - spot) < Math.abs(a - spot) ? b : a))
  const atmIdx = sorted.indexOf(atm)
  return sorted.slice(Math.max(0, atmIdx - win.n), Math.min(sorted.length - 1, atmIdx + win.n) + 1)
}

export function ladderRows(
  chain: readonly ChainContract[],
  spot: number,
  window: number | StrikeWindow,
  set: LadderColumnSet,
  fitIvPts: ((k: number) => number) | null,
  move: number | null = null,
): LadderRow[] {
  const strikes = [...new Set(chain.map((c) => c.strike))].sort((a, b) => a - b)
  if (strikes.length === 0 || spot <= 0) return []
  const atm = strikes.reduce((a, b) => (Math.abs(b - spot) < Math.abs(a - spot) ? b : a))
  const win: StrikeWindow = typeof window === 'number' ? { kind: 'count', n: window } : window
  return windowStrikes(strikes, spot, win, move).map((strike) => {
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

/** The design's card set: the two nearest listed, then three standard monthlies. */
export const CARD_NEAREST = 2
export const CARD_MONTHLIES = 3

/**
 * A standard monthly expiry: the third Friday of its month, or the Thursday
 * before it when that Friday is a market holiday and the Thursday is listed in
 * its place (2027-06-17, before Juneteenth observed).
 */
export function isMonthlyExpiry(iso: string, listed: ReadonlySet<string>): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return false
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  if (dow === 5) return d >= 15 && d <= 21
  if (dow === 4 && d >= 14 && d <= 20) {
    const friday = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
    return !listed.has(friday)
  }
  return false
}

/**
 * The expiry cards, as the design draws them (`EXP`: two weeklies, then three
 * monthlies — 9, 16, 37, 72, 100 days): the two nearest listed, then the next
 * three standard monthlies, so the cards span months rather than the ten days
 * a name with weeklies fills with its five nearest. A name whose store lists
 * fewer monthlies fills the set with its nearest others. The one a link handed
 * over (a Symbol-list contract row, the Dealer face's ⇢) joins when it is not
 * among them — landing elsewhere would light the same strike on a different
 * contract. `handedMissing` when the store does not list it at all.
 *
 * The first listed expiry after the estimated print carries its premium — the
 * term note names it — and the weekly + monthly pick can pass it by (PLTR
 * 2026-09-26: print ~2 Nov, 11-06 between the 10-16 and 11-20 cards), so it
 * joins too, as `event`. A late print has no date to be after.
 */
export function cardExpiries(
  listed: readonly string[] | undefined,
  handed: string | null,
  print?: ExpectedEarnings | null,
): { expiries: string[]; handedMissing: boolean; event: string | null } {
  const all = listed ?? []
  const set = new Set(all)
  const near = all.slice(0, CARD_NEAREST)
  const rest = all.slice(CARD_NEAREST)
  const monthlies = rest.filter((e) => isMonthlyExpiry(e, set)).slice(0, CARD_MONTHLIES)
  const fill = rest.filter((e) => !monthlies.includes(e)).slice(0, CARD_MONTHLIES - monthlies.length)
  const expiries = [...near, ...monthlies, ...fill]
  if (handed && all.includes(handed) && !expiries.includes(handed)) expiries.push(handed)
  const event = print && print.days_away >= 0 ? (all.find((e) => e > print.date) ?? null) : null
  if (event && !expiries.includes(event)) expiries.push(event)
  expiries.sort()
  return { expiries, handedMissing: Boolean(handed && listed && !all.includes(handed)), event }
}

/** A card's earnings mark; the event expiry's says why it is among the cards. */
export function cardEarnings(
  next: ExpectedEarnings | null | undefined,
  dte: number,
  isEvent: boolean
): ExpiryEarnings | null {
  const earn = expiryEarnings(next, dte)
  if (!earn || !isEvent || !next) return earn
  return {
    ...earn,
    title: `First expiry after the estimated print (~${shortDate(next.date)}) — it carries the event premium, as the term note says. ${earn.title}`,
  }
}

/**
 * The contract card's liquidity and checks — the retired Discovery detail's
 * liquidity / data-quality / event-warning blocks, off the chain the face
 * already holds. Spread needs a quote the plan does not carry, so liquidity is
 * the contract's open interest ranked among its own side of the expiry, and the
 * session's volume against it.
 */
export interface ContractChecks {
  /** Share of same-side contracts at this expiry with OI at or below this one. */
  oiPctile: number | null
  sameSide: number
  volOi: number | null
  warnings: string[]
}

export function contractChecks(
  chain: readonly ChainContract[],
  c: ChainContract,
  opts: { dte: number | null; earningsDaysAway: number | null; earningsDate: string | null; snapshotTs: string | null; today: string },
): ContractChecks {
  const side = chain.filter((x) => x.right === c.right && x.oi != null)
  const oiPctile = c.oi != null && side.length > 0 ? side.filter((x) => (x.oi ?? 0) <= (c.oi ?? 0)).length / side.length : null
  const volOi = c.oi != null && c.oi > 0 && c.volume != null ? c.volume / c.oi : null
  const warnings: string[] = []
  const { dte } = opts
  if (dte != null && dte <= 0) warnings.push('Expiration day — liquidity can vanish into the close; avoid market orders.')
  else if (dte != null && dte <= 3) warnings.push(`${dte} DTE — theta decays fast, and exercise or assignment is close.`)
  if (opts.earningsDaysAway != null && opts.earningsDaysAway >= 0 && dte != null && opts.earningsDaysAway <= dte) {
    warnings.push(`Earnings ${opts.earningsDate ? `~${opts.earningsDate} ` : ''}fall before this expiry — the premium carries the print.`)
  }
  if (!c.volume) warnings.push('No trade this session — the mark is an older print.')
  if (c.oi != null && c.oi < 100) warnings.push(`Open interest ${c.oi} — an exit may have no one on the other side.`)
  if (opts.snapshotTs) {
    const age = Math.round((Date.parse(opts.today) - Date.parse(opts.snapshotTs.slice(0, 10))) / 86_400_000)
    if (age > 3) warnings.push(`Snapshot from ${opts.snapshotTs.slice(0, 10)}, ${age} days old.`)
  }
  return { oiPctile, sameSide: side.length, volOi, warnings }
}

/** The watchlist key, as the Trade API builds it (`contract_key_from_parts`). */
export function optionWatchlistKey(symbol: string, expiry: string, strike: number, right: 'C' | 'P'): string {
  const exp = expiry.replace(/-/g, '').slice(0, 8)
  const k = Number.isInteger(strike) ? strike.toFixed(1) : String(strike)
  return `${symbol.trim().toUpperCase()}|OPT|${exp}|${k}|${right}`
}
