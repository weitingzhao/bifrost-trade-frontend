/**
 * The option book measured against the base it sits on.
 *
 * Positions is not five kinds of instrument side by side. It is one layer being
 * managed — the options — drawing on a base of stock, income ETFs and cash. The
 * page used to show five slices and none of the relationship, so the questions a
 * premium seller opens it to answer — how much of the base is spoken for, how
 * tight it is, how much room is left, what could go wrong — had to be assembled
 * across three screens.
 *
 * Four graded gauges, each from a source the page already derives:
 *
 *   pressure   the broker's own margin cushion, read verbatim
 *   backing    what the options need against what actually backs them
 *   risk       short legs already in the money, or about to expire
 *   potential  what is still free to sell against, and what the book earns daily
 *
 * Levels are 0–3. The bands are spacing, not doctrine, and are exported so a
 * caller can move them; the one anchored on an external fact — pressure 3 at
 * 75% because the broker liquidates at 100% — says so where it is set.
 *
 * Income ETFs are counted in buying power only, never as option collateral.
 * Owner decision, 2026-09-05: their margin treatment differs from common stock,
 * and a haircut table would be a second opinion on a number the broker already
 * holds.
 */
import type { LivePositionRow } from '@/types/positions'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { MarginRollup } from './marginPressure'
import type { ExposureSummary } from './assignmentExposure'
import type { ExpiryLadderRow } from './positionsOptionRisk'
import { summaryNum } from './marginPressure'

export type GaugeLevel = 0 | 1 | 2 | 3

/** Pressure bands on 1 − Cushion. Level 3 is anchored: IB liquidates at 100%. */
export const PRESSURE_BANDS = { idle: 0.1, heavy: 0.5, critical: 0.75 } as const

export interface RiskCounts {
  itm: number
  near7d: number
  zeroDte: number
  past: number
  unpriced: number
  /** Tightest short-leg cushion across the book; null when nothing was priced. */
  tightest: number | null
}

export interface BookVsBase {
  pressure: {
    level: GaugeLevel
    /** 1 − the broker's Cushion. Null when no funded account reported one. */
    pct: number | null
    cushion: number | null
  }
  backing: {
    level: GaugeLevel
    callsCovered: number
    callsTotal: number
    nakedCalls: number
    putCashNeeded: number
    /** Cash plus cash-like holdings (SGOV and the like). */
    cashLike: number
    /** Share of put obligations the cash-like layer covers; the rest sits on margin. */
    putsCashCovered: number | null
  }
  risk: {
    level: GaugeLevel
    counts: RiskCounts
  }
  potential: {
    sharesFree: number
    /** Whole contracts the free shares could back. */
    moreCalls: number
    /** Buying power less the cash a full put assignment would take. */
    unusedBuyingPower: number | null
    thetaPerDay: number | null
  }
  demand: { putCash: number; callShares: number }
  supply: {
    cashLike: number
    buyingPower: number | null
    sharesHeld: number
    sharesFree: number
  }
  base: BaseLayer[]
}

export type BaseRole = 'stocks' | 'income' | 'cash'

export interface BaseLayer {
  role: BaseRole
  label: string
  marketValue: number
  /** Shares for stocks; contracts of cover they provide; symbols for the others. */
  shares: number
  symbols: string[]
  /** One line on what this layer does for the option book. */
  note: string
  /** How much of this layer the options are using, 0–1. Null when not applicable. */
  used: number | null
  /** Market value of the part in use, and of the part still free. Per symbol for stocks. */
  backingValue?: number
  freeValue?: number
}

const SHARES_PER_CONTRACT = 100

function marketValue(rows: readonly LivePositionRow[]): number {
  let total = 0
  for (const r of rows) {
    const qty = Number(r.position)
    const px = r.price != null ? Number(r.price) : Number.NaN
    if (!Number.isFinite(qty) || !Number.isFinite(px)) continue
    total += Math.abs(qty) * px
  }
  return total
}

/**
 * Cover is per symbol. A portfolio-wide "free shares" total was the first cut,
 * and it said 44 more calls could be written when 26 could: RKLB's spare shares
 * cannot back a MU call. Each symbol's long shares are set against that
 * symbol's short calls, and only the remainder counts as free.
 */
function coverBySymbol(
  coreStocks: readonly LivePositionRow[],
  bySymbol: ExposureSummary['bySymbol'],
): { held: number; backing: number; free: number; backingValue: number; freeValue: number; moreCalls: number } {
  const shares = new Map<string, { qty: number; price: number | null }>()
  for (const r of coreStocks) {
    const sym = (r.symbol ?? '').toUpperCase()
    const qty = Number(r.position)
    if (!sym || !Number.isFinite(qty) || qty <= 0) continue
    const px = r.price != null && Number.isFinite(Number(r.price)) ? Number(r.price) : null
    const cur = shares.get(sym)
    shares.set(sym, { qty: (cur?.qty ?? 0) + qty, price: px ?? cur?.price ?? null })
  }
  const need = new Map<string, number>()
  for (const e of bySymbol) {
    need.set(e.underlying, (e.coveredCallContracts + e.nakedCallContracts) * SHARES_PER_CONTRACT)
  }
  let held = 0
  let backing = 0
  let free = 0
  let backingValue = 0
  let freeValue = 0
  let moreCalls = 0
  for (const [sym, { qty, price }] of shares) {
    // Fractional shares (dividend reinvestment) cannot back a contract.
    const whole = Math.floor(qty)
    const used = Math.min(whole, need.get(sym) ?? 0)
    const spare = whole - used
    held += whole
    backing += used
    free += spare
    moreCalls += Math.floor(spare / SHARES_PER_CONTRACT)
    if (price != null) {
      backingValue += used * price
      freeValue += spare * price
    }
  }
  return { held, backing, free, backingValue, freeValue, moreCalls }
}

function symbolsOf(rows: readonly LivePositionRow[]): string[] {
  return Array.from(new Set(rows.map((r) => (r.symbol ?? '').toUpperCase()).filter(Boolean))).sort()
}

/** TotalCashValue summed across funded accounts. */
function totalCash(accounts: readonly IbAccountSnapshot[]): number {
  let n = 0
  for (const a of accounts) {
    const v = summaryNum(a.summary, 'TotalCashValue')
    if (v != null) n += v
  }
  return n
}

export function pressureLevel(pct: number | null): GaugeLevel {
  if (pct == null) return 0
  if (pct >= PRESSURE_BANDS.critical) return 3
  if (pct >= PRESSURE_BANDS.heavy) return 2
  if (pct >= PRESSURE_BANDS.idle) return 1
  return 0
}

/**
 * Backing: naked calls are the defining fact. One is level 2 whatever else is
 * true; a majority naked is 3; puts leaning on margin rather than cash is 1.
 */
export function backingLevel(input: {
  callsTotal: number
  nakedCalls: number
  putsCashCovered: number | null
}): GaugeLevel {
  if (input.nakedCalls > 0) {
    return input.callsTotal > 0 && input.nakedCalls * 2 > input.callsTotal ? 3 : 2
  }
  if (input.putsCashCovered != null && input.putsCashCovered < 1) return 1
  return 0
}

/** Risk: in the money outranks near expiry; both together with a 0DTE is 3. */
export function riskLevel(c: RiskCounts): GaugeLevel {
  if (c.itm > 0 && c.zeroDte > 0) return 3
  if (c.itm > 0) return 2
  if (c.near7d > 0 || c.past > 0) return 1
  return 0
}

/**
 * Collapse the expiry ladder into the counts the risk gauge grades on. The
 * same loop the alarm checks use, lifted so both read one derivation.
 */
export function riskCountsFromLadder(rows: readonly ExpiryLadderRow[], nearDays: number): RiskCounts {
  const c: RiskCounts = { itm: 0, near7d: 0, zeroDte: 0, past: 0, unpriced: 0, tightest: null }
  for (const r of rows) {
    c.itm += r.itmShortCount
    c.unpriced += r.unpricedShortCount
    if (r.tightestCushionPct != null) {
      if (c.tightest == null || r.tightestCushionPct < c.tightest) c.tightest = r.tightestCushionPct
    }
    if (r.dte == null) continue
    if (r.dte < 0) c.past += r.shortContracts
    else if (r.dte === 0) c.zeroDte += r.shortContracts
    if (r.dte >= 0 && r.dte <= nearDays) c.near7d += r.shortContracts
  }
  return c
}

export function deriveBookVsBase(input: {
  margin: MarginRollup
  exposure: ExposureSummary
  risk: RiskCounts
  thetaPerDay: number | null
  coreStocks: readonly LivePositionRow[]
  incomeEtfs: readonly LivePositionRow[]
  cashLike: readonly LivePositionRow[]
  accounts: readonly IbAccountSnapshot[]
}): BookVsBase {
  const { margin, exposure, risk } = input

  const callsTotal = exposure.coveredCallContracts + exposure.nakedCallContracts
  const callShares = callsTotal * SHARES_PER_CONTRACT
  const cover = coverBySymbol(input.coreStocks, exposure.bySymbol)
  const sharesHeld = cover.held
  const sharesBacking = cover.backing
  const sharesFree = cover.free

  const cashLike = totalCash(input.accounts) + marketValue(input.cashLike)
  const putCash = exposure.putAssignmentCash
  const putsCashCovered = putCash > 0 ? Math.min(1, cashLike / putCash) : null

  const buyingPower =
    margin.accounts.length > 0
      ? margin.accounts.reduce((n, a) => n + (a.buyingPower ?? 0), 0)
      : null

  const pressurePct = margin.pressure
  const cushion = pressurePct == null ? null : 1 - pressurePct

  const incomeValue = marketValue(input.incomeEtfs)
  const stockValue = marketValue(input.coreStocks)

  return {
    pressure: { level: pressureLevel(pressurePct), pct: pressurePct, cushion },
    backing: {
      level: backingLevel({ callsTotal, nakedCalls: exposure.nakedCallContracts, putsCashCovered }),
      callsCovered: exposure.coveredCallContracts,
      callsTotal,
      nakedCalls: exposure.nakedCallContracts,
      putCashNeeded: putCash,
      cashLike,
      putsCashCovered,
    },
    risk: { level: riskLevel(risk), counts: risk },
    potential: {
      sharesFree,
      moreCalls: cover.moreCalls,
      unusedBuyingPower: buyingPower == null ? null : Math.max(0, buyingPower - putCash),
      thetaPerDay: input.thetaPerDay,
    },
    demand: { putCash, callShares },
    supply: { cashLike, buyingPower, sharesHeld, sharesFree },
    base: [
      {
        role: 'stocks',
        label: 'Stocks',
        marketValue: stockValue,
        shares: sharesHeld,
        symbols: symbolsOf(input.coreStocks),
        note:
          sharesHeld === 0
            ? 'No shares held — every short call is naked'
            : `${sharesBacking.toLocaleString()} backing calls · ${sharesFree.toLocaleString()} free — room for ${cover.moreCalls} more contracts on the same names`,
        used: sharesHeld > 0 ? sharesBacking / sharesHeld : null,
        backingValue: cover.backingValue,
        freeValue: cover.freeValue,
      },
      {
        role: 'income',
        label: 'Income ETFs',
        marketValue: incomeValue,
        shares: 0,
        symbols: symbolsOf(input.incomeEtfs),
        note: 'Yield, not option collateral — counted in buying power only',
        used: null,
      },
      {
        role: 'cash',
        label: 'Cash and SGOV',
        marketValue: cashLike,
        shares: 0,
        symbols: symbolsOf(input.cashLike),
        note:
          putCash <= 0
            ? 'No put obligations to cover'
            : putsCashCovered != null && putsCashCovered >= 1
              ? 'Covers every put obligation in cash'
              : `Covers ${Math.round((putsCashCovered ?? 0) * 100)}% of put obligations — the rest sits on margin`,
        used: putsCashCovered,
        backingValue: Math.min(cashLike, putCash),
        freeValue: Math.max(0, cashLike - putCash),
      },
    ],
  }
}
