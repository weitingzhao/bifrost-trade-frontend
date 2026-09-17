import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { closingFillFromNet, quickCloseBody, signedCloseQuantity, signedFillQty } from './quickCloseOffset'

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

describe('signedCloseQuantity', () => {
  it('stores a sell as a negative size, like the execution form and the journal', () => {
    expect(signedCloseQuantity({ side: 'SELL', quantity: 3 })).toBe(-3)
    expect(signedCloseQuantity({ side: 'BUY', quantity: 3 })).toBe(3)
  })
})

describe('quickCloseBody', () => {
  // Invented contract and ids.
  const opened = exec({
    side: 'Sell',
    account_id: 'A1',
    symbol: 'ZZZ   240119P00050000',
    sec_type: 'OPT',
    contract_key: 'ZZZ   240119P00050000|OPT|20240119|50.0|P',
    expiry: '20240119',
    strike: 50,
    option_right: 'P',
    strategy_instance_id: 11,
    strategy_opportunity_id: 7,
  })

  it('writes a journal row, which the performance book reads, not a manual one', () => {
    const body = quickCloseBody(opened, { side: 'BUY', quantity: 2 }, 0, undefined, 1_700_000_000)
    expect(body.source).toBe('journal_closed')
    expect(body.quantity).toBe(2)
    expect(body.contract_key).toBe('ZZZ   240119P00050000|OPT|20240119|50.0|P')
    expect(body.option_right).toBe('P')
    expect(body).toMatchObject({ strategy_instance_id: 11, strategy_opportunity_id: 7 })
  })

  it('stores a sell as a negative size and sends the strategy only as a pair', () => {
    const lone = { ...opened, strategy_opportunity_id: null } as Execution
    const body = quickCloseBody(lone, { side: 'SELL', quantity: 3 }, 1.2, 0.65, 1_700_000_000)
    expect(body.quantity).toBe(-3)
    expect(body).not.toHaveProperty('strategy_instance_id')
    expect(body).not.toHaveProperty('strategy_opportunity_id')
  })
})
