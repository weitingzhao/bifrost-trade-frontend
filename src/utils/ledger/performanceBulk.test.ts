import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { stkFixedIncomeStreamUsd, stkSignedTradeNotionalUsd } from './performanceBulk'

function stk(side: 'Buy' | 'Sell', qty: number, price: number): Execution {
  return { sec_type: 'STK', side, quantity: qty, price } as Execution
}

describe('stkSignedTradeNotionalUsd (Stocks)', () => {
  it('SELL is positive', () => {
    expect(stkSignedTradeNotionalUsd(stk('Sell', 10, 100))).toBe(1000)
  })

  it('BUY is negative', () => {
    expect(stkSignedTradeNotionalUsd(stk('Buy', 10, 100))).toBe(-1000)
  })
})

describe('stkFixedIncomeStreamUsd (Fixed Income Stream)', () => {
  it('BUY is positive (capital into FI)', () => {
    expect(stkFixedIncomeStreamUsd(stk('Buy', 10, 100))).toBe(1000)
  })

  it('SELL is negative (capital out of FI)', () => {
    expect(stkFixedIncomeStreamUsd(stk('Sell', 10, 100))).toBe(-1000)
  })
})
