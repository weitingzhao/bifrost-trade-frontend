import { describe, it, expect } from 'vitest'
import {
  monthKeyToPeriodKey,
  comparePeriodKeysDesc,
  formatPeriodLabel,
  rollupOptionsFromMonthly,
  getSinceTradeDateRange,
  ledgerExecutionDateKey,
  executionMatchesLedgerTradePeriod,
} from './summaryPeriod'

describe('monthKeyToPeriodKey', () => {
  it('returns month key for month period', () => {
    expect(monthKeyToPeriodKey('2024-03', 'month')).toBe('2024-03')
  })

  it('returns year for year period', () => {
    expect(monthKeyToPeriodKey('2024-03', 'year')).toBe('2024')
  })

  it('returns correct quarter', () => {
    expect(monthKeyToPeriodKey('2024-01', 'quarter')).toBe('2024-Q1')
    expect(monthKeyToPeriodKey('2024-04', 'quarter')).toBe('2024-Q2')
    expect(monthKeyToPeriodKey('2024-07', 'quarter')).toBe('2024-Q3')
    expect(monthKeyToPeriodKey('2024-10', 'quarter')).toBe('2024-Q4')
  })

  it('returns correct half year', () => {
    expect(monthKeyToPeriodKey('2024-01', 'half_year')).toBe('2024-H1')
    expect(monthKeyToPeriodKey('2024-06', 'half_year')).toBe('2024-H1')
    expect(monthKeyToPeriodKey('2024-07', 'half_year')).toBe('2024-H2')
    expect(monthKeyToPeriodKey('2024-12', 'half_year')).toBe('2024-H2')
  })

  it('returns input for invalid format', () => {
    expect(monthKeyToPeriodKey('invalid', 'quarter')).toBe('invalid')
  })
})

describe('comparePeriodKeysDesc', () => {
  it('sorts years descending', () => {
    expect(comparePeriodKeysDesc('2024', '2023')).toBeLessThan(0)
    expect(comparePeriodKeysDesc('2023', '2024')).toBeGreaterThan(0)
  })

  it('sorts months descending', () => {
    expect(comparePeriodKeysDesc('2024-03', '2024-01')).toBeLessThan(0)
  })

  it('sorts quarters descending', () => {
    expect(comparePeriodKeysDesc('2024-Q2', '2024-Q1')).toBeLessThan(0)
  })
})

describe('formatPeriodLabel', () => {
  it('formats year', () => {
    expect(formatPeriodLabel('2024', 'year')).toBe('2024')
  })

  it('formats month', () => {
    expect(formatPeriodLabel('2024-03', 'month')).toBe('2024-03')
  })

  it('formats quarter', () => {
    expect(formatPeriodLabel('2024-Q1', 'quarter')).toBe('2024 Q1')
  })

  it('formats half year', () => {
    expect(formatPeriodLabel('2024-H2', 'half_year')).toBe('2024 H2')
  })
})

describe('rollupOptionsFromMonthly', () => {
  it('aggregates by quarter', () => {
    const monthly: [string, { count: number; realizedPnl: number }][] = [
      ['2024-01', { count: 3, realizedPnl: 100 }],
      ['2024-02', { count: 2, realizedPnl: 50 }],
      ['2024-04', { count: 1, realizedPnl: -20 }],
    ]
    const result = rollupOptionsFromMonthly(monthly, 'quarter')
    expect(result).toHaveLength(2)
    const q1 = result.find(([k]) => k === '2024-Q1')
    expect(q1).toBeDefined()
    expect(q1![1].count).toBe(5)
    expect(q1![1].realizedPnl).toBe(150)
  })
})

describe('getSinceTradeDateRange', () => {
  it('returns correct range for YTD', () => {
    const ref = new Date(2024, 5, 15)
    const r = getSinceTradeDateRange('ytd', ref)
    expect(r.start).toBe('2024-01-01')
    expect(r.end).toBe('2024-06-15')
  })

  it('returns correct range for month lookback', () => {
    const ref = new Date(2024, 5, 15)
    const r = getSinceTradeDateRange('month', ref)
    expect(r.start).toBe('2024-05-15')
    expect(r.end).toBe('2024-06-15')
  })

  it('returns very old start for all', () => {
    const r = getSinceTradeDateRange('all')
    expect(r.start).toBe('2000-01-01')
  })
})

describe('ledgerExecutionDateKey', () => {
  it('prefers trade_date over time', () => {
    expect(ledgerExecutionDateKey('2024-03-15', 1700000000)).toBe('2024-03-15')
  })

  it('falls back to time if no trade_date', () => {
    const key = ledgerExecutionDateKey(null, 1700000000)
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns null if both missing', () => {
    expect(ledgerExecutionDateKey(null, null)).toBeNull()
  })
})

describe('executionMatchesLedgerTradePeriod', () => {
  const range = { start: '2024-03-01', end: '2024-03-31' }

  it('matches date within range', () => {
    expect(executionMatchesLedgerTradePeriod('2024-03-15', null, range)).toBe(true)
  })

  it('matches boundary dates', () => {
    expect(executionMatchesLedgerTradePeriod('2024-03-01', null, range)).toBe(true)
    expect(executionMatchesLedgerTradePeriod('2024-03-31', null, range)).toBe(true)
  })

  it('rejects date outside range', () => {
    expect(executionMatchesLedgerTradePeriod('2024-04-01', null, range)).toBe(false)
  })
})
