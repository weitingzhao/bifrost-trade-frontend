import { describe, it, expect } from 'vitest'
import { buildObligationsRows } from './obligationsRows'
import type { LivePositionRow } from '@/types/positions'

const stk = (account_id: string, symbol: string, position: number, price: number | null, avgCost = 10): LivePositionRow =>
  ({ symbol, position, price, avgCost, category: 'Stocks', secType: 'STK', account_id }) as LivePositionRow

describe('buildObligationsRows', () => {
  it('joins exposure and cover per account × symbol, and keeps both one-sided cases', () => {
    const rows = buildObligationsRows(
      [
        // Puts only, no shares anywhere.
        { accountId: 'U1', underlying: 'DDOG', putAssignmentCash: 20_000, shortPutContracts: 1, coveredCallContracts: 0, nakedCallContracts: 0, callDeliveryShares: 0 },
        // Calls in U2 with no U2 shares — every one naked.
        { accountId: 'U2', underlying: 'RKLB', putAssignmentCash: 0, shortPutContracts: 0, coveredCallContracts: 0, nakedCallContracts: 3, callDeliveryShares: 0 },
      ],
      [
        // Shares in U1 with no options — pure room.
        { accountId: 'U1', symbol: 'RKLB', held: 1600, backing: 0, spare: 1600, moreCalls: 16, price: 70 },
      ],
      [stk('U1', 'RKLB', 1600, 70, 20)],
    )
    const byKey = Object.fromEntries(rows.map((r) => [`${r.accountId}:${r.symbol}`, r]))
    expect(byKey['U1:DDOG']).toMatchObject({ shortPuts: 1, cashIfAssigned: 20_000, sharesHeld: 0, price: null, marketValue: null })
    expect(byKey['U2:RKLB']).toMatchObject({ nakedCalls: 3, sharesHeld: 0, moreCalls: 0 })
    expect(byKey['U1:RKLB']).toMatchObject({ sharesHeld: 1600, sharesSpare: 1600, moreCalls: 16, price: 70, avgCost: 20, marketValue: 112_000 })
    expect(rows).toHaveLength(3)
  })

  it('an unpriced lot leaves market value unknown rather than zero', () => {
    const rows = buildObligationsRows(
      [],
      [{ accountId: 'U1', symbol: 'AAA', held: 100, backing: 0, spare: 100, moreCalls: 1, price: null }],
      [stk('U1', 'AAA', 100, null)],
    )
    expect(rows[0].price).toBeNull()
    expect(rows[0].marketValue).toBeNull()
  })
})
