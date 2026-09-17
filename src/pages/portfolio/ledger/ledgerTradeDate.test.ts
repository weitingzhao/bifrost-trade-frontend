import { describe, expect, it } from 'vitest'
import { fmtLedgerTradeDate } from './ledgerTradeDate'

describe('fmtLedgerTradeDate', () => {
  it('writes the date token, not ISO', () => {
    expect(fmtLedgerTradeDate('2024-03-15')).toBe('15MAR24')
    expect(fmtLedgerTradeDate('20240315')).toBe('15MAR24')
  })

  it('says a row has no trade date instead of borrowing its entry time', () => {
    expect(fmtLedgerTradeDate(null)).toBe('no trade date')
    expect(fmtLedgerTradeDate('  ')).toBe('no trade date')
  })
})
