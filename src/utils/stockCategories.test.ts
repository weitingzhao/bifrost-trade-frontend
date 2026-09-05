import { describe, it, expect } from 'vitest'
import { isLedgerCashLikeCategory, isLedgerFixedIncomeCategory } from './stockCategories'

// The category strings the account snapshot actually emits for STK rows
// (DEV, 2026-09-05): 'Option leg', 'Fix Income', 'SEPA', 'Cash'.
describe('isLedgerCashLikeCategory', () => {
  it('accepts the bare "Cash" the snapshot uses for SGOV', () => {
    expect(isLedgerCashLikeCategory('Cash')).toBe(true)
    expect(isLedgerCashLikeCategory(' cash ')).toBe(true)
  })
  it('still accepts the longer spellings', () => {
    expect(isLedgerCashLikeCategory('Cash-like')).toBe(true)
    expect(isLedgerCashLikeCategory('Cash equivalent')).toBe(true)
    expect(isLedgerCashLikeCategory('Money market')).toBe(true)
  })
  it('never claims fixed income, option legs, or SEPA names', () => {
    expect(isLedgerCashLikeCategory('Fix Income')).toBe(false)
    expect(isLedgerCashLikeCategory('Fixed Income')).toBe(false)
    expect(isLedgerCashLikeCategory('Option leg')).toBe(false)
    expect(isLedgerCashLikeCategory('SEPA')).toBe(false)
    expect(isLedgerCashLikeCategory('')).toBe(false)
    expect(isLedgerCashLikeCategory('—')).toBe(false)
  })
})

describe('isLedgerFixedIncomeCategory', () => {
  it('matches both spellings the snapshot has used', () => {
    expect(isLedgerFixedIncomeCategory('Fix Income')).toBe(true)
    expect(isLedgerFixedIncomeCategory('Fixed income')).toBe(true)
    expect(isLedgerFixedIncomeCategory('Cash')).toBe(false)
  })
})
