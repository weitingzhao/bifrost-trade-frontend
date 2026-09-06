import { describe, it, expect } from 'vitest'
import { explainBook, explainMarginRow, litSegments, potentialSegments, type ExplainInputs } from './bookExplanations'
import { deriveBookVsBase } from './bookVsBase'
import { summarizeAssignmentExposure } from './assignmentExposure'
import { rollupMargin } from './marginPressure'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'

const account = (account_id: string, summary: Record<string, string>): IbAccountSnapshot =>
  ({ account_id, summary, positions: [] }) as unknown as IbAccountSnapshot
const stk = (account_id: string, symbol: string, position: number, price: number, category = 'Stocks'): LivePositionRow =>
  ({ account_id, symbol, position, price, category, secType: 'STK' }) as LivePositionRow

function inputs(): ExplainInputs {
  const accounts = [
    account('U1', { NetLiquidation: '1000000', ExcessLiquidity: '730000', Cushion: '0.73', BuyingPower: '1870000', MaintMarginReq: '270000', TotalCashValue: '15374.70' }),
  ]
  const margin = rollupMargin(accounts)
  const exposure = summarizeAssignmentExposure(
    [
      { underlying: 'NVDA', accountId: 'U1', strike: 245, expiry: '20261120', right: 'C', qty: -5 },
      { underlying: 'DDOG', accountId: 'U1', strike: 200, expiry: '20261016', right: 'P', qty: -1 },
    ],
    (sym, acct) => (sym === 'NVDA' && acct === 'U1' ? 500 : 0),
  )
  const coreStocks = [stk('U1', 'NVDA', 500, 230.36)]
  const cashLikeRows = [stk('U1', 'SGOV', 570, 100.47, 'Cash')]
  const book = deriveBookVsBase({
    margin,
    exposure,
    risk: { itm: 0, near7d: 0, zeroDte: 0, past: 0, unpriced: 1, tightest: 0.064 },
    thetaPerDay: 42,
    coreStocks,
    incomeEtfs: [],
    cashLike: cashLikeRows,
    accounts,
  })
  return {
    book,
    exposure,
    margin,
    accounts,
    cashLikeRows,
    coverRows: [{ accountId: 'U1', symbol: 'NVDA', held: 500, backing: 500, spare: 0, moreCalls: 0, price: 230.36 }],
    tightPct: 0.03,
  }
}

describe('explainBook', () => {
  it('quotes the same numbers the cockpit shows, with the formula and the rows they came from', () => {
    const e = explainBook('putCash', inputs())
    expect(e.lines[0]).toContain('$20,000.00')
    expect(e.rows).toEqual([{ label: 'U1 DDOG', value: '1 put → $20,000.00' }])
    const calls = explainBook('callShares', inputs())
    expect(calls.lines[0]).toContain('500 sh')
    expect(calls.rows?.[0]).toMatchObject({ label: 'U1 NVDA', value: '5 × 100 = 500 sh · 500 backed', warn: false })
  })
  it('explains pressure from the broker fields and names the four segments', () => {
    const e = explainBook('pressure', inputs())
    expect(e.lines[0]).toBe('Pressure 27% = 1 − Cushion 73%.')
    expect(e.rows?.[0].value).toContain('Cushion 73% → pressure 27%')
    expect(e.scale).toHaveLength(4)
    expect(e.scale?.[3]).toContain('75%')
  })
  it('explains cash-like from TotalCashValue plus the SGOV rows', () => {
    const e = explainBook('cashLike', inputs())
    expect(e.rows?.map((r) => r.label)).toEqual(['U1 cash', 'U1 SGOV'])
    expect(e.rows?.[1].value).toBe('570 × $100.47 = $57,267.90')
  })
  it('marks a naked call as a warning row', () => {
    const inp = inputs()
    const e = explainBook('backing', { ...inp, coverRows: [] })
    expect(e.rows?.[0]).toMatchObject({ label: 'U1 NVDA', warn: false })
    expect(e.scale?.[2]).toBe('3/4 any naked call')
  })
})

describe('segments', () => {
  it('a graded gauge lights level + 1 segments; potential is the free share of held shares', () => {
    expect(litSegments(null)).toBe(0)
    expect(litSegments(0)).toBe(1)
    expect(litSegments(3)).toBe(4)
    const inp = inputs()
    expect(potentialSegments(inp.book)).toBe(0)
    expect(potentialSegments({ ...inp.book, supply: { ...inp.book.supply, sharesHeld: 1000, sharesFree: 480 } })).toBe(2)
  })
})

describe('explainMarginRow', () => {
  it('names each broker field behind the row', () => {
    const f = inputs().margin.accounts[0]
    const e = explainMarginRow(f, 'Host')
    expect(e.title).toBe('Host — U1')
    expect(e.lines[0]).toBe("Pressure 27% = 1 − Cushion 73%. Cushion is read from the broker's own field (= ExcessLiquidity / NetLiquidation), never recomputed.")
    expect(e.lines[1]).toContain('BP $1,870,000.00 = BuyingPower')
  })
})
