/** Shared test fixture for Room to add: one account, five covered calls, one cash-secured put. */
import { deriveBookVsBase } from '@/utils/bookVsBase'
import { summarizeAssignmentExposure } from '@/utils/assignmentExposure'
import { rollupMargin } from '@/utils/marginPressure'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'
import type { SpotResolver } from '@/utils/spotPrice'
import type { RoomLeg } from '@/utils/roomToAdd'

const account = (account_id: string, summary: Record<string, string>): IbAccountSnapshot =>
  ({ account_id, summary, positions: [] }) as unknown as IbAccountSnapshot
const stk = (account_id: string, symbol: string, position: number, price: number, category = 'Stocks'): LivePositionRow =>
  ({ account_id, symbol, position, price, category, secType: 'STK' }) as LivePositionRow

/** Noon, local time, 2026-09-05 — the tenor counts local calendar days like the grid. */
export const NOW = new Date(2026, 8, 5, 12).getTime() / 1000

// One account: NLV 1,000,000, excess 730,000 (pressure 27%), available 700,000, cash 15,374.70.
// 500 NVDA back five 245 calls in full; one DDOG 200 put reserves 20,000 of the 72,642.60 cash-like.
export function fixture() {
  const accounts = [
    account('U1', {
      NetLiquidation: '1000000',
      EquityWithLoanValue: '1000000',
      ExcessLiquidity: '730000',
      AvailableFunds: '700000',
      Cushion: '0.73',
      BuyingPower: '2800000',
      MaintMarginReq: '270000',
      InitMarginReq: '270000',
      TotalCashValue: '15374.70',
    }),
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
    risk: { itm: 0, near7d: 0, zeroDte: 0, past: 0, unpriced: 0, tightest: 0.064 },
    thetaPerDay: 42,
    coreStocks,
    incomeEtfs: [],
    cashLike: cashLikeRows,
    accounts,
  })
  const legs: RoomLeg[] = [
    { underlying: 'NVDA', accountId: 'U1', strike: 245, expiry: '20261120', right: 'C', qty: -5, avgCostPerShare: 9.99 },
    { underlying: 'DDOG', accountId: 'U1', strike: 200, expiry: '20261016', right: 'P', qty: -1, avgCostPerShare: 9.95 },
  ]
  const spots: Record<string, number> = { NVDA: 230.36, DDOG: 213 }
  const resolveSpot: SpotResolver = (sym) => (sym in spots ? { price: spots[sym], source: 'close', asOf: NOW } : null)
  const coverRows = [{ accountId: 'U1', symbol: 'NVDA', held: 500, backing: 500, spare: 0, moreCalls: 0, price: 230.36 }]
  return { book, margin, legs, resolveSpot, coverRows }
}

