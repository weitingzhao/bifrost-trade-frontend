import { describe, expect, it } from 'vitest'
import { journalCreateBody, journalDraftFromSeed, journalSeedFromExpired, journalSeedFromStockAdd } from './ledgerJournalWrite'

describe('journalDraftFromSeed', () => {
  it('Expired worthless uses the net-flattening side and a zero price', () => {
    const d = journalDraftFromSeed({
      mode: 'expired',
      accountId: 'A1',
      symbol: 'ZZZ',
      secType: 'OPT',
      netQty: 3,
      expiry: '20240119',
      strike: 50,
      optionRight: 'C',
    })
    expect(d.side).toBe('SELL')
    expect(d.quantity).toBe(3)
    expect(d.price).toBe(0)
    expect(d.secType).toBe('OPT')
  })
})

describe('journalCreateBody', () => {
  it('writes journal_closed with a signed quantity and no trade_date', () => {
    const res = journalCreateBody(
      {
        mode: 'gap',
        accountId: 'A1',
        symbol: 'ZZZ',
        secType: 'STK',
        side: 'SELL',
        quantity: 2,
        price: 4,
      },
      1_700_000_000,
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.body.source).toBe('journal_closed')
    expect(res.body.quantity).toBe(-2)
    expect(res.body.time).toBe(1_700_000_000)
    expect(res.body).not.toHaveProperty('trade_date')
    expect(res.body).not.toHaveProperty('transaction_type')
  })

  it('refuses Assignment until the API can store BookTrade', () => {
    const res = journalCreateBody(
      {
        mode: 'assigned',
        accountId: 'A1',
        symbol: 'ZZZ',
        secType: 'OPT',
        side: 'SELL',
        quantity: 1,
        price: 0,
      },
      1_700_000_000,
    )
    expect(res.ok).toBe(false)
  })
})

describe('journal seeds', () => {
  it('locks account and symbol for a Stocks Add journal', () => {
    const seed = journalSeedFromStockAdd('A1', 'ZZZ')
    expect(seed).toMatchObject({
      mode: 'gap',
      accountId: 'A1',
      symbol: 'ZZZ',
      secType: 'STK',
      lockAccount: true,
      lockSymbol: true,
    })
  })

  it('Expired worthless seed copies the contract and net qty', () => {
    const seed = journalSeedFromExpired(
      {
        account_executions_id: 9,
        account_id: 'A1',
        contract_key: 'ZZZ  240119C00050000',
        symbol: 'ZZZ',
        sec_type: 'OPT',
        side: 'Buy',
        qty: 3,
        quantity: 3,
        price: 1.25,
        time: 1_700_000_000,
        expiry: '20240119',
        strike: 50,
        option_right: 'C',
        strategy_instance_id: 21,
      } as import('@/types/positions').Execution,
      3,
    )
    expect(seed.mode).toBe('expired')
    expect(seed.lockAccount).toBe(true)
    expect(seed.lockSymbol).toBe(true)
    expect(seed.netQty).toBe(3)
    expect(seed.instanceId).toBe(21)
    expect(seed.expiry).toBe('20240119')
  })
})
