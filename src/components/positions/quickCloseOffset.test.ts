import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { closingFillFromNet, signedFillQty } from './quickCloseOffset'

function exec(partial: Pick<Execution, 'side'> & Partial<Execution>): Execution {
  return {
    account_executions_id: 9001,
    account_id: 'DU0000001',
    contract_key: 'AAA|OPT|20261218|10.0|C',
    symbol: 'AAA',
    sec_type: 'OPT',
    qty: 0,
    price: 1,
    time: 1_700_000_000,
    ...partial,
  }
}

describe('closingFillFromNet', () => {
  it('writes SELL for a long net, BUY for a short net', () => {
    expect(closingFillFromNet(3)).toEqual({ side: 'SELL', quantity: 3 })
    expect(closingFillFromNet(-2)).toEqual({ side: 'BUY', quantity: 2 })
  })

  it('treats a flat net as nothing to close', () => {
    expect(closingFillFromNet(0)).toBeNull()
  })
})

describe('signedFillQty', () => {
  it('reads IB BUY/SELL and BOT/SLD aliases, not the title-case Buy the old modal compared', () => {
    expect(signedFillQty(exec({ side: 'BUY' as Execution['side'], qty: 4 }))).toBe(4)
    expect(signedFillQty(exec({ side: 'SELL' as Execution['side'], qty: 4 }))).toBe(-4)
    expect(signedFillQty(exec({ side: 'BOT' as Execution['side'], quantity: 2, qty: 9 }))).toBe(2)
    expect(signedFillQty(exec({ side: 'SLD' as Execution['side'], quantity: 2, qty: 9 }))).toBe(-2)
  })

  it('still reads title-case Buy/Sell if a caller already mapped them', () => {
    expect(signedFillQty(exec({ side: 'Buy', qty: 5 }))).toBe(5)
    expect(signedFillQty(exec({ side: 'Sell', qty: 5 }))).toBe(-5)
  })
})

describe('the old Quick Close side test', () => {
  it('would have written BUY for every IB fill because side never equals Buy', () => {
    const fill = exec({ side: 'BUY' as Execution['side'], qty: 3 })
    const oldSide = fill.side === 'Buy' ? 'SELL' : 'BUY'
    expect(oldSide).toBe('BUY')
    expect(closingFillFromNet(signedFillQty(fill))?.side).toBe('SELL')
  })
})
