import { describe, it, expect } from 'vitest'
import { bookGauges } from './bookGauges'
import { deriveBookVsBase } from './bookVsBase'
import { summarizeAssignmentExposure } from './assignmentExposure'
import { rollupMargin } from './marginPressure'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'

// Invented figures throughout: one account, five covered calls, one short put.
const account = (account_id: string, summary: Record<string, string>): IbAccountSnapshot =>
  ({ account_id, summary, positions: [] }) as unknown as IbAccountSnapshot
const stk = (
  account_id: string,
  symbol: string,
  position: number,
  price: number,
  category = 'Stocks'
): LivePositionRow =>
  ({ account_id, symbol, position, price, category, secType: 'STK' }) as LivePositionRow

function book(risk: { itm: number; unpriced: number } = { itm: 0, unpriced: 1 }) {
  const accounts = [
    account('U1', {
      NetLiquidation: '1000000',
      EquityWithLoanValue: '1000000',
      ExcessLiquidity: '730000',
      AvailableFunds: '730000',
      Cushion: '0.73',
      BuyingPower: '1870000',
      MaintMarginReq: '270000',
      InitMarginReq: '270000',
      TotalCashValue: '15000',
    }),
  ]
  const exposure = summarizeAssignmentExposure(
    [
      { underlying: 'NVDA', accountId: 'U1', strike: 245, expiry: '20261120', right: 'C', qty: -5 },
      { underlying: 'DDOG', accountId: 'U1', strike: 200, expiry: '20261016', right: 'P', qty: -1 },
    ],
    (sym, acct) => (sym === 'NVDA' && acct === 'U1' ? 500 : 0)
  )
  return deriveBookVsBase({
    margin: rollupMargin(accounts),
    exposure,
    risk: {
      itm: risk.itm,
      near7d: 0,
      zeroDte: 0,
      past: 0,
      unpriced: risk.unpriced,
      tightest: 0.064,
    },
    thetaPerDay: 42,
    coreStocks: [stk('U1', 'NVDA', 500, 230)],
    incomeEtfs: [],
    cashLike: [stk('U1', 'SGOV', 570, 100, 'Cash')],
    accounts,
  })
}

describe('bookGauges', () => {
  it('reads the four gauges in the order the page argues them', () => {
    expect(bookGauges(book(), { tightPct: 0.03 }).map((g) => g.id)).toEqual([
      'pressure',
      'backing',
      'risk',
      'potential',
    ])
  })

  it('leads each card with one figure and keeps the line that made the grade', () => {
    const [pressure, backing, risk] = bookGauges(book(), { tightPct: 0.03 })
    expect(pressure).toMatchObject({
      hero: '27%',
      read: '27% used · cushion 73% · liquidation at 100%',
    })
    expect(backing.hero).toBe('5/5')
    expect(backing.read).toMatch(/^5\/5 calls covered · puts \$20\.0k vs cash /)
    expect(risk).toMatchObject({
      hero: '0 ITM',
      read: '0 ITM · 0 ≤7d · 1 unpriced · tightest +6.4% vs 3%',
    })
  })

  it('turns a graded card amber from three of four lit, never the meter', () => {
    const calm = bookGauges(book(), { tightPct: 0.03 })
    expect(calm.find((g) => g.id === 'risk')?.warn).toBe(false)
    const hot = bookGauges(book({ itm: 1, unpriced: 0 }), { tightPct: 0.03 })
    expect(hot.find((g) => g.id === 'risk')).toMatchObject({ hero: '1 ITM', lit: 3, warn: true })
    expect(hot.find((g) => g.id === 'potential')).toMatchObject({ meter: true, warn: false })
  })

  it('leads Potential with the premium a cycle, and says so, only when it can be priced', () => {
    const bare = bookGauges(book(), { tightPct: 0.03 })[3]
    expect(bare.hero).toBe('—')
    expect(bare.read).not.toContain('per cycle')
    const room = { calls: 2, puts: 3, marginPuts: 65, ceiling: 0.5, income: 1234 }
    const priced = bookGauges(book(), { tightPct: 0.03, room })[3]
    expect(priced.hero).toBe('+$1.2k')
    expect(priced.read).toMatch(
      /^Room \+2 calls · \+3 puts backed · \+65 on margin to 50% · θ \+\$42\/d · per cycle$/
    )
  })

  it('never prints a count as a ratio when there is nothing to count', () => {
    const accounts = [account('U1', { NetLiquidation: '1000', Cushion: '0.9' })]
    const empty = deriveBookVsBase({
      margin: rollupMargin(accounts),
      exposure: summarizeAssignmentExposure([], () => 0),
      risk: { itm: 0, near7d: 0, zeroDte: 0, past: 0, unpriced: 0, tightest: null },
      thetaPerDay: null,
      coreStocks: [],
      incomeEtfs: [],
      cashLike: [],
      accounts,
    })
    const [, backing, risk] = bookGauges(empty, { tightPct: 0.03 })
    expect(backing.hero).toBe('no calls')
    expect(risk.read).toContain('tightest n/a')
  })
})
