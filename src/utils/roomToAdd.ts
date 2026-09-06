/**
 * Room to add — how much more option book the base could carry, in the
 * three steps the Owner asked for: what the free shares and cash-like back
 * on their own (no new margin), what margin adds up to a pressure ceiling
 * the trader sets, and what each step does to the Pressure gauge.
 *
 * Income is extrapolated from the book's own entry premium per dollar of
 * backing in use — the same yield the current contracts were sold at, not a
 * market forecast. The margin per short put is IB's Reg T requirement run on
 * the short puts already held and averaged; the broker's own what-if is an
 * order-desk call this page does not make. Every figure here is an estimate
 * and says so; the only broker numbers are the excess liquidity, net
 * liquidation and available funds the headroom is measured against.
 */
import type { BookVsBase, CoverRow, GaugeLevel } from '@/utils/bookVsBase'
import { pressureLevel } from '@/utils/bookVsBase'
import type { MarginRollup } from '@/utils/marginPressure'
import { normalizeRight } from '@/utils/positionsOptionRisk'
import type { SpotResolver } from '@/utils/spotPrice'

const SHARES_PER_CONTRACT = 100

/** A leg as the alarm flattens it; the entry cost is per share, IB's ×100 already unwound. */
export interface RoomLeg {
  underlying: string
  accountId: string
  strike: number
  expiry: string
  right: string
  /** Signed: negative is short. */
  qty: number
  avgCostPerShare?: number | null
}

export interface RoomInputs {
  book: BookVsBase
  /** Accounts in scope — the headroom is theirs. */
  margin: MarginRollup
  legs: readonly RoomLeg[]
  coverRows: readonly CoverRow[]
  resolveSpot: SpotResolver
  /** Pressure the margin step may run up to, 0–1. */
  ceiling: number
  /** Unix seconds; injected so the tenor is testable. */
  nowSec?: number
}

/** One short put run through the Reg T requirement. */
export interface PutMarginModel {
  accountId: string
  underlying: string
  strike: number
  expiry: string
  contracts: number
  spot: number
  otm: number
  premiumPerShare: number
  /** Per contract, dollars. */
  margin: number
}

/** One leg's entry premium, kept so the explanation can name where the total came from. */
export interface LegPremium {
  accountId: string
  underlying: string
  strike: number
  right: string
  expiry: string
  /** Absolute contracts; `side` carries the sign. */
  contracts: number
  side: 'short' | 'long'
  /** Credit for a short, debit for a long; always positive. */
  premium: number
}

export interface RoomAccount {
  accountId: string
  pressure: number | null
  cushion: number | null
  excessLiquidity: number | null
  netLiquidation: number | null
  availableFunds: number | null
  /** (ceiling − pressure) × NLV, capped by AvailableFunds; null when the broker left a field out. */
  headroom: number | null
}

export interface RoomToAdd {
  ceiling: number
  now: {
    pressure: number | null
    level: GaugeLevel
    calls: number
    puts: number
    /** Short credits less long debits, at entry, over the legs in scope. */
    netPremium: number
    shortPutPremium: number
    /** Days to the nearest and farthest short expiry. */
    tenor: { min: number; max: number } | null
    /** Broker sums over the accounts in scope — what the pressure arithmetic runs on. */
    excessLiquidity: number
    netLiquidation: number
    /** Every leg's entry premium, so the total can be walked back to its legs. */
    legs: LegPremium[]
  }
  pool: {
    /** Backing the current contracts hold: shares behind calls at price, cash behind puts. */
    used: number
    usedSharesValue: number
    usedPutCash: number
    freeSharesValue: number
    /** Free shares at price plus free cash-like. Income ETFs are not here — they back nothing without margin. */
    free: number
    /** netPremium ÷ used — the premium a dollar of backing earned this cycle. */
    yieldPerCycle: number | null
  }
  backed: {
    calls: number
    freeShares: number
    cashFree: number
    cashPerPut: number | null
    puts: number | null
    income: number | null
    putMargin: number | null
    pressureAfter: number | null
  }
  margin: {
    accounts: RoomAccount[]
    headroom: number | null
    /** Headroom left after the backed step's puts take their Reg T margin. */
    headroomAfterBacked: number | null
    models: PutMarginModel[]
    unmodelledPuts: number
    marginPerPut: number | null
    /** Cash-secured dollars per put over Reg T dollars per put. */
    leverage: number | null
    premiumPerPut: number | null
    puts: number | null
    income: number | null
    pressureAfter: number | null
    level: GaugeLevel | null
  }
}

/** The three figures the cockpit's Potential line carries, with a link to the rest. */
export interface RoomSummary {
  calls: number
  puts: number | null
  marginPuts: number | null
  ceiling: number
}

export function summarizeRoom(r: RoomToAdd): RoomSummary {
  return { calls: r.backed.calls, puts: r.backed.puts, marginPuts: r.margin.puts, ceiling: r.ceiling }
}

/**
 * IB's Reg T requirement for a naked equity put, per contract: the premium
 * plus the greater of 20% of the underlying less the out-of-the-money amount
 * and 10% of the strike, times the multiplier. Maintenance uses the same
 * formula, so one number serves both.
 */
export function regTShortPutMargin(spot: number, strike: number, premiumPerShare: number): number {
  const otm = Math.max(0, spot - strike)
  const base = Math.max(0.2 * spot - otm, 0.1 * strike)
  return (base + Math.max(0, premiumPerShare)) * SHARES_PER_CONTRACT
}

/**
 * Days from `nowSec` to a YYYYMMDD expiry, on local calendar days — the same
 * arithmetic as the grid's DTE column (utils/positions daysUntilExpiry), so the
 * tenor here reads the same as the ladder; null when unparseable.
 */
export function daysToExpiry(expiry: string, nowSec: number): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec((expiry ?? '').trim())
  if (!m) return null
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const now = new Date(nowSec * 1000)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const cents = (v: number) => Math.round(v * 100) / 100

export function computeRoomToAdd(input: RoomInputs): RoomToAdd {
  const { book, margin, legs, resolveSpot } = input
  const ceiling = Math.min(0.95, Math.max(0, input.ceiling))
  const nowSec = input.nowSec ?? Date.now() / 1000

  // Premium at entry, and the short puts the margin step models from.
  let netPremium = 0
  let shortPutPremium = 0
  let shortPuts = 0
  let unmodelledPuts = 0
  const models: PutMarginModel[] = []
  const legRows: LegPremium[] = []
  let tenor: { min: number; max: number } | null = null
  for (const leg of legs) {
    const contracts = Math.abs(leg.qty)
    if (!finite(leg.qty) || contracts === 0) continue
    const premPerShare = finite(leg.avgCostPerShare) ? Math.abs(leg.avgCostPerShare) : null
    const premium = premPerShare == null ? 0 : cents(premPerShare * SHARES_PER_CONTRACT * contracts)
    legRows.push({
      accountId: leg.accountId,
      underlying: leg.underlying,
      strike: leg.strike,
      right: (leg.right ?? '').toUpperCase(),
      expiry: leg.expiry,
      contracts,
      side: leg.qty < 0 ? 'short' : 'long',
      premium,
    })
    if (leg.qty < 0) {
      netPremium += premium
      const dte = daysToExpiry(leg.expiry, nowSec)
      if (dte != null) tenor = tenor ? { min: Math.min(tenor.min, dte), max: Math.max(tenor.max, dte) } : { min: dte, max: dte }
    } else {
      netPremium -= premium
    }
    if (leg.qty < 0 && normalizeRight(leg.right) === 'P') {
      shortPuts += contracts
      shortPutPremium += premium
      const spot = resolveSpot(leg.underlying)?.price ?? null
      if (spot == null || !finite(leg.strike) || leg.strike <= 0) {
        unmodelledPuts += contracts
        continue
      }
      models.push({
        accountId: leg.accountId,
        underlying: leg.underlying,
        strike: leg.strike,
        expiry: leg.expiry,
        contracts,
        spot,
        otm: Math.max(0, spot - leg.strike),
        premiumPerShare: premPerShare ?? 0,
        margin: cents(regTShortPutMargin(spot, leg.strike, premPerShare ?? 0)),
      })
    }
  }
  const modelled = models.reduce((n, m) => n + m.contracts, 0)
  const marginPerPut = modelled > 0 ? models.reduce((n, m) => n + m.margin * m.contracts, 0) / modelled : null
  const premiumPerPut = shortPuts > 0 ? shortPutPremium / shortPuts : null

  // The pool as the Backing ring draws it, less the income ETFs.
  const stocks = book.base.find((l) => l.role === 'stocks')
  const putCash = book.backing.putCashNeeded
  const cashLike = book.backing.cashLike
  const cashFree = Math.max(0, cashLike - putCash)
  const used = (stocks?.backingValue ?? 0) + Math.min(putCash, cashLike)
  const free = (stocks?.freeValue ?? 0) + cashFree
  const yieldPerCycle = used > 0 ? netPremium / used : null

  // Step one: what the base backs on its own.
  const cashPerPut = shortPuts > 0 && putCash > 0 ? putCash / shortPuts : null
  const backedPuts = cashPerPut != null ? Math.floor(cashFree / cashPerPut) : null
  const backedIncome = yieldPerCycle == null ? null : yieldPerCycle * free

  // Step two: margin, up to the ceiling, in the accounts in scope.
  const accounts: RoomAccount[] = margin.accounts.map((a) => {
    const known = a.pressure != null && a.netLiquidation != null
    const raw = known ? cents(Math.max(0, (ceiling - (a.pressure as number)) * (a.netLiquidation as number))) : null
    const headroom = raw == null ? null : a.availableFunds != null ? Math.min(raw, Math.max(0, a.availableFunds)) : raw
    return {
      accountId: a.accountId,
      pressure: a.pressure,
      cushion: a.cushion,
      excessLiquidity: a.excessLiquidity,
      netLiquidation: a.netLiquidation,
      availableFunds: a.availableFunds,
      headroom,
    }
  })
  const knownAccounts = accounts.filter((a) => a.headroom != null)
  const headroom = knownAccounts.length > 0 ? knownAccounts.reduce((n, a) => n + (a.headroom as number), 0) : null
  const backedMargin = backedPuts != null && marginPerPut != null ? backedPuts * marginPerPut : 0
  const headroomAfterBacked = headroom == null ? null : Math.max(0, headroom - backedMargin)
  const marginPuts = headroomAfterBacked != null && marginPerPut != null && marginPerPut > 0 ? Math.floor(headroomAfterBacked / marginPerPut) : null
  const marginIncome = marginPuts != null && premiumPerPut != null ? marginPuts * premiumPerPut : null
  const leverage = cashPerPut != null && marginPerPut != null && marginPerPut > 0 ? cashPerPut / marginPerPut : null

  // Step three: where the gauge lands. Each new put takes its Reg T margin out of excess liquidity.
  const nlvTotal = margin.accounts.reduce((n, a) => n + (a.netLiquidation ?? 0), 0)
  const excessTotal = margin.accounts.reduce((n, a) => n + (a.excessLiquidity ?? 0), 0)
  const pressureWith = (puts: number | null): number | null => {
    if (puts == null) return null
    if (puts === 0) return book.pressure.pct
    if (marginPerPut == null || nlvTotal <= 0) return null
    return Math.min(1, Math.max(0, 1 - (excessTotal - puts * marginPerPut) / nlvTotal))
  }
  const backedPutMargin = backedPuts != null && marginPerPut != null ? backedPuts * marginPerPut : null
  const pressureAfterBacked = pressureWith(backedPuts)
  const pressureAfterMargin = marginPuts == null ? null : pressureWith((backedPuts ?? 0) + marginPuts)

  return {
    ceiling,
    now: {
      pressure: book.pressure.pct,
      level: book.pressure.level,
      calls: book.backing.callsTotal,
      puts: shortPuts,
      netPremium,
      shortPutPremium,
      tenor,
      excessLiquidity: excessTotal,
      netLiquidation: nlvTotal,
      legs: legRows,
    },
    pool: {
      used,
      usedSharesValue: stocks?.backingValue ?? 0,
      usedPutCash: Math.min(putCash, cashLike),
      freeSharesValue: stocks?.freeValue ?? 0,
      free,
      yieldPerCycle,
    },
    backed: {
      calls: book.potential.moreCalls,
      freeShares: book.supply.sharesFree,
      cashFree,
      cashPerPut,
      puts: backedPuts,
      income: backedIncome,
      /** Reg T the backed puts take even though cash stands behind them. */
      putMargin: backedPutMargin,
      pressureAfter: pressureAfterBacked,
    },
    margin: {
      accounts,
      headroom,
      headroomAfterBacked,
      models,
      unmodelledPuts,
      marginPerPut,
      leverage,
      premiumPerPut,
      puts: marginPuts,
      income: marginIncome,
      pressureAfter: pressureAfterMargin,
      level: pressureAfterMargin == null ? null : pressureLevel(pressureAfterMargin),
    },
  }
}
