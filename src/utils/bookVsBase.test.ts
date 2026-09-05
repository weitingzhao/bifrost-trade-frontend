import { describe, it, expect } from 'vitest'
import {
  backingLevel,
  coverByAccountSymbol,
  deriveBookVsBase,
  pressureLevel,
  riskCountsFromLadder,
  riskLevel,
  PRESSURE_BANDS,
  type RiskCounts,
} from './bookVsBase'
import type { MarginRollup } from './marginPressure'
import type { ExposureSummary } from './assignmentExposure'
import type { ExpiryLadderRow } from './positionsOptionRisk'
import type { LivePositionRow } from '@/types/positions'

const stk = (symbol: string, position: number, price: number, category = 'Stocks'): LivePositionRow =>
  ({ symbol, position, price, category, secType: 'STK', account_id: 'U1' }) as LivePositionRow

const margin = (pressure: number | null, bp: number | null): MarginRollup => ({
  accounts: bp == null ? [] : [{ accountId: 'U1', buyingPower: bp } as never],
  netLiquidation: 1_000_000,
  maintMarginReq: 0,
  excessLiquidity: 0,
  pressure,
  tightest: null,
})

const exposure = (o: Partial<ExposureSummary> = {}): ExposureSummary => ({
  byAccountSymbol: [],
  putAssignmentCash: 0,
  shortPutContracts: 0,
  coveredCallContracts: 0,
  nakedCallContracts: 0,
  largest: null,
  ...o,
})

const quiet: RiskCounts = { itm: 0, near7d: 0, zeroDte: 0, past: 0, unpriced: 0, tightest: 0.2 }

const row = (o: Partial<ExpiryLadderRow>): ExpiryLadderRow => ({
  expiry: '20261120',
  dte: 30,
  legCount: 1,
  shortContracts: 1,
  longContracts: 0,
  itmShortCount: 0,
  unpricedShortCount: 0,
  symbols: ['AAA'],
  instanceCount: 1,
  tightestCushionPct: 0.2,
  ...o,
})

describe('pressureLevel', () => {
  it('is anchored on the broker liquidating at 100%', () => {
    expect(pressureLevel(PRESSURE_BANDS.critical)).toBe(3)
    expect(pressureLevel(0.6)).toBe(2)
    expect(pressureLevel(0.26)).toBe(1)
    expect(pressureLevel(0.05)).toBe(0)
  })
  it('has no opinion without a cushion', () => {
    expect(pressureLevel(null)).toBe(0)
  })
})

describe('backingLevel', () => {
  it('any naked call is at least level 2', () => {
    expect(backingLevel({ callsTotal: 31, nakedCalls: 1, putsCashCovered: 1 })).toBe(2)
  })
  it('a majority naked is level 3', () => {
    expect(backingLevel({ callsTotal: 3, nakedCalls: 2, putsCashCovered: 1 })).toBe(3)
  })
  it('puts leaning on margin is level 1', () => {
    expect(backingLevel({ callsTotal: 10, nakedCalls: 0, putsCashCovered: 0.15 })).toBe(1)
  })
  it('fully backed is level 0', () => {
    expect(backingLevel({ callsTotal: 10, nakedCalls: 0, putsCashCovered: 1 })).toBe(0)
    expect(backingLevel({ callsTotal: 0, nakedCalls: 0, putsCashCovered: null })).toBe(0)
  })
})

describe('riskLevel', () => {
  it('in the money outranks near expiry', () => {
    expect(riskLevel({ ...quiet, near7d: 4 })).toBe(1)
    expect(riskLevel({ ...quiet, itm: 1 })).toBe(2)
    expect(riskLevel({ ...quiet, itm: 1, zeroDte: 1 })).toBe(3)
  })
  it('contracts still open past expiry are not quiet', () => {
    expect(riskLevel({ ...quiet, past: 2 })).toBe(1)
  })
})

describe('riskCountsFromLadder', () => {
  it('collapses the ladder the way the alarm checks do', () => {
    const c = riskCountsFromLadder(
      [
        row({ dte: 0, shortContracts: 2 }),
        row({ dte: 5, shortContracts: 3, itmShortCount: 1, tightestCushionPct: -0.02 }),
        row({ dte: -1, shortContracts: 1, unpricedShortCount: 1 }),
        row({ dte: 40, shortContracts: 9, tightestCushionPct: 0.4 }),
      ],
      7,
    )
    expect(c).toEqual({ itm: 1, near7d: 5, zeroDte: 2, past: 1, unpriced: 1, tightest: -0.02 })
  })
})

describe('deriveBookVsBase', () => {
  const book = () =>
    deriveBookVsBase({
      margin: margin(0.26, 3_016_050),
      exposure: exposure({
        putAssignmentCash: 131_500,
        shortPutContracts: 8,
        coveredCallContracts: 30,
        nakedCallContracts: 1,
        byAccountSymbol: [
          { accountId: 'U1', underlying: 'RKLB', putAssignmentCash: 0, shortPutContracts: 0, coveredCallContracts: 10, nakedCallContracts: 0, callDeliveryShares: 1000 },
          { accountId: 'U1', underlying: 'NVDA', putAssignmentCash: 0, shortPutContracts: 0, coveredCallContracts: 5, nakedCallContracts: 0, callDeliveryShares: 500 },
          { accountId: 'U1', underlying: 'HIMS', putAssignmentCash: 0, shortPutContracts: 0, coveredCallContracts: 9, nakedCallContracts: 0, callDeliveryShares: 900 },
          { accountId: 'U1', underlying: 'MU', putAssignmentCash: 0, shortPutContracts: 0, coveredCallContracts: 0, nakedCallContracts: 1, callDeliveryShares: 0 },
        ],
      }),
      risk: { ...quiet, unpriced: 13 },
      thetaPerDay: 356,
      coreStocks: [stk('RKLB', 2600, 71.885), stk('NVDA', 500, 183.885), stk('HIMS', 900, 24.7)],
      incomeEtfs: [stk('PFF', 3492, 30.7, 'Fixed income'), stk('BALI', 2090, 31.575, 'Fixed income')],
      cashLike: [stk('SGOV', 570, 100.53, 'Cash-like')],
      accounts: [{ account_id: 'U1', summary: { TotalCashValue: '15374.70' } }],
    })

  it('backing reads the calls covered, the naked one, and the puts against cash', () => {
    const b = book().backing
    expect(b.callsCovered).toBe(30)
    expect(b.callsTotal).toBe(31)
    expect(b.nakedCalls).toBe(1)
    expect(b.level).toBe(2)
    // 15,374.70 cash + 570 × 100.53 SGOV against 131,500 of put obligations.
    expect(b.cashLike).toBeCloseTo(15_374.7 + 57_302.1, 1)
    expect(b.putsCashCovered).toBeCloseTo((15_374.7 + 57_302.1) / 131_500, 4)
  })

  it('potential is per symbol — spare RKLB shares cannot back a MU call', () => {
    const p = book().potential
    // RKLB 2,600 − 1,000 backing = 1,600 free; NVDA and HIMS are fully used.
    // A portfolio-wide total would have said 1,600 free too here, but the
    // contract count must come from each name: 16, not floor(1600/100) by luck.
    expect(p.sharesFree).toBe(1600)
    expect(p.moreCalls).toBe(16)
    expect(p.unusedBuyingPower).toBeCloseTo(3_016_050 - 131_500, 2)
    expect(p.thetaPerDay).toBe(356)
  })

  it('demand and supply are the two sides of the same numbers', () => {
    const { demand, supply } = book()
    expect(demand.callShares).toBe(3100)
    expect(demand.putCash).toBe(131_500)
    expect(supply.sharesHeld).toBe(4000)
    expect(supply.sharesFree).toBe(1600)
  })

  it('fractional shares cannot back a contract and are not counted', () => {
    const b = deriveBookVsBase({
      margin: margin(0.1, 100_000),
      exposure: exposure({
        coveredCallContracts: 1,
        byAccountSymbol: [{ accountId: 'U1', underlying: 'AAA', putAssignmentCash: 0, shortPutContracts: 0, coveredCallContracts: 1, nakedCallContracts: 0, callDeliveryShares: 100 }],
      }),
      risk: quiet,
      thetaPerDay: null,
      coreStocks: [stk('AAA', 299.731, 10)],
      incomeEtfs: [],
      cashLike: [],
      accounts: [],
    })
    expect(b.supply.sharesHeld).toBe(299)
    expect(b.potential.sharesFree).toBe(199)
    expect(b.potential.moreCalls).toBe(1)
  })

  it('income ETFs are never counted as collateral', () => {
    const b = book()
    const income = b.base.find((l) => l.role === 'income')!
    expect(income.used).toBeNull()
    expect(income.symbols).toEqual(['BALI', 'PFF'])
    // …and they are absent from every collateral figure.
    expect(b.supply.cashLike).toBeCloseTo(15_374.7 + 57_302.1, 1)
    expect(b.supply.sharesHeld).toBe(4000)
  })

  it('each base layer says what it does for the options', () => {
    const layers = book().base
    expect(layers.map((l) => l.role)).toEqual(['stocks', 'income', 'cash'])
    expect(layers[0].note).toContain('2,400 backing calls')
    expect(layers[0].note).toContain('16 more contracts')
    expect(layers[2].note).toMatch(/Covers \d+% of put obligations/)
  })

  it('a layer\'s "in use" is the share of the layer taken, on both rows', () => {
    const layers = book().base
    // Stocks: 2,400 of 4,000 shares back calls.
    expect(layers[0].used).toBeCloseTo(2400 / 4000, 6)
    // Cash: 72,676.80 against 131,500 of puts — all of it is spoken for, so 100%…
    expect(layers[2].used).toBe(1)
    // …and when cash exceeds the obligation, in-use is the fraction taken, not 100%.
    const rich = deriveBookVsBase({
      margin: margin(0.1, 500_000),
      exposure: exposure({ putAssignmentCash: 50_000, shortPutContracts: 2 }),
      risk: quiet,
      thetaPerDay: null,
      coreStocks: [],
      incomeEtfs: [],
      cashLike: [stk('SGOV', 2000, 100, 'Cash')],
      accounts: [],
    })
    expect(rich.base[2].used).toBeCloseTo(0.25, 6)
    expect(rich.base[2].note).toBe('Covers every put obligation in cash')
    expect(rich.backing.putsCashCovered).toBe(1)
  })

  it('a book with no puts has no cash coverage to report', () => {
    const b = deriveBookVsBase({
      margin: margin(0.1, 100_000),
      exposure: exposure({ coveredCallContracts: 2 }),
      risk: quiet,
      thetaPerDay: null,
      coreStocks: [stk('AAA', 200, 10)],
      incomeEtfs: [],
      cashLike: [],
      accounts: [],
    })
    expect(b.backing.putsCashCovered).toBeNull()
    expect(b.base[2].note).toBe('No put obligations to cover')
  })

  it('no held shares means every short call is naked, and says so', () => {
    const b = deriveBookVsBase({
      margin: margin(null, null),
      exposure: exposure({ nakedCallContracts: 1 }),
      risk: quiet,
      thetaPerDay: null,
      coreStocks: [],
      incomeEtfs: [],
      cashLike: [],
      accounts: [],
    })
    expect(b.base[0].note).toContain('naked')
    expect(b.potential.unusedBuyingPower).toBeNull()
    expect(b.pressure.pct).toBeNull()
  })
})

describe('coverByAccountSymbol', () => {
  const calls = (accountId: string, underlying: string, covered: number, naked: number) => ({
    accountId,
    underlying,
    putAssignmentCash: 0,
    shortPutContracts: 0,
    coveredCallContracts: covered,
    nakedCallContracts: naked,
    callDeliveryShares: covered * 100,
  })

  it('shares in one account cannot cover a call written in another', () => {
    // U1 holds 1,600 RKLB; the three calls are written in U2.
    const cover = coverByAccountSymbol([stk('RKLB', 1600, 70)], [calls('U2', 'RKLB', 0, 3)])
    expect(cover.backing).toBe(0)
    expect(cover.free).toBe(1600)
    expect(cover.moreCalls).toBe(16)
    expect(cover.rows).toEqual([
      { accountId: 'U1', symbol: 'RKLB', held: 1600, backing: 0, spare: 1600, moreCalls: 16, price: 70 },
    ])
  })

  it('unpriced shares still count as cover but are reported, not valued', () => {
    const cover = coverByAccountSymbol(
      [{ ...stk('AAA', 250, 10), price: null } as LivePositionRow],
      [calls('U1', 'AAA', 2, 0)],
    )
    expect(cover.backing).toBe(200)
    expect(cover.free).toBe(50)
    expect(cover.unpricedShares).toBe(250)
    expect(cover.backingValue).toBe(0)
    expect(cover.freeValue).toBe(0)
  })
})
