import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { executionPassesLedgerFilters, parseLedgerTradeDay, type LedgerFilterMatchArgs } from './ledgerFilterMatch'

const base: LedgerFilterMatchArgs = {
  accountFilter: 'all',
  symbolFilter: '',
  allowedOpportunityIds: null,
  activeTab: 'options',
  expiryFilterYear: '',
  expiryFilterMonth: '',
  sincePreset: 'month',
  dateRange: { start: '2026-01-01', end: '2026-01-31' },
  rowType: 'all',
}

// Invented rows.
const fill = (trade_date: string | null) => ({ symbol: 'ZZZ', sec_type: 'OPT', trade_date }) as unknown as Execution

describe('parseLedgerTradeDay', () => {
  it('takes a real calendar date and nothing else', () => {
    expect(parseLedgerTradeDay('2026-01-05')).toBe('2026-01-05')
    expect(parseLedgerTradeDay('2026-02-30')).toBeNull()
    expect(parseLedgerTradeDay('05JAN26')).toBeNull()
    expect(parseLedgerTradeDay(null)).toBeNull()
  })
})

describe('trade date filter', () => {
  it('keeps only that day’s fills, in place of the Since window', () => {
    const args = { ...base, tradeDay: '2026-01-05', dateRange: { start: '2026-01-05', end: '2026-01-05' } }
    expect(executionPassesLedgerFilters(fill('2026-01-05'), args)).toBe(true)
    expect(executionPassesLedgerFilters(fill('2026-01-06'), args)).toBe(false)
  })

  it('does not count an undated row as that day, though a window keeps it', () => {
    expect(executionPassesLedgerFilters(fill(null), { ...base, tradeDay: '2026-01-05' })).toBe(false)
    expect(executionPassesLedgerFilters(fill(null), base)).toBe(true)
  })
})
