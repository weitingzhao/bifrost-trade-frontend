import { describe, expect, it } from 'vitest'
import type { FreshnessRow } from '@/utils/accountsFreshnessRows'
import type { ReadingMetric } from '@/utils/performanceReading'
import { STATE_BAR, STATE_LAMP, totalsStrip, trustBoard, trustVerdict } from './portfolioOverviewModel'

// Invented accounts and sources — the shape is what is under test.
const row = (over: Partial<FreshnessRow> = {}): FreshnessRow => ({
  key: 'k',
  accountId: 'A1',
  role: 'Host',
  source: 'flex_trades',
  age: '1.0d',
  days: 1,
  reading: 'current',
  state: 'current',
  meaning: 'Newest record is inside the trading day.',
  ...over,
})

describe('trustBoard', () => {
  it('sorts by age, not by severity', () => {
    // The half-year-old journal is the oldest row on the board even though no
    // threshold applies to it. Burying it under a two-day lag would make the
    // header's "oldest first" a lie.
    const out = trustBoard([
      row({ key: 'lag', days: 2.1, state: 'behind' }),
      row({ key: 'journal', days: 184, state: 'noReading' }),
      row({ key: 'stale', days: 166, state: 'dry' }),
    ])
    expect(out.map((r) => r.key)).toEqual(['journal', 'stale', 'lag'])
  })

  it('puts a row with no age last — unmeasured is not old', () => {
    const out = trustBoard([row({ key: 'none', days: null, state: 'noReading' }), row({ key: 'a', days: 5 })])
    expect(out.map((r) => r.key)).toEqual(['a', 'none'])
    expect(out[1].bar).toBeNull()
  })

  it('measures each row against the oldest, not against a ceiling in days', () => {
    const out = trustBoard([row({ key: 'a', days: 100 }), row({ key: 'b', days: 25 })])
    expect(out[0].bar).toBe(1)
    expect(out[1].bar).toBe(0.25)
  })
})

describe('trustVerdict', () => {
  it('counts silence apart from staleness, because they are different failures', () => {
    const v = trustVerdict([
      row({ state: 'dry' }),
      row({ state: 'dry' }),
      row({ state: 'noReading' }),
      row({ state: 'current' }),
      row({ state: 'current' }),
    ])
    expect(v.headline).toBe('2 of 5 sources are over a month old, and 1 never wrote at all')
    expect(v.tone).toBe('danger')
  })

  it('drops to a warning when nothing is stale but something is behind', () => {
    expect(trustVerdict([row({ state: 'behind' }), row()])).toEqual({
      headline: '1 of 2 sources are behind',
      tone: 'warning',
    })
  })

  it('says so plainly, and without a tone, when everything is current', () => {
    expect(trustVerdict([row(), row()])).toEqual({ headline: 'Every source is current', tone: undefined })
  })

  it('treats an empty board as a failure, never as an all-clear', () => {
    expect(trustVerdict([]).tone).toBe('danger')
  })
})

describe('the lamp and the bar', () => {
  it('agree on every state, so a row cannot read two ways at once', () => {
    expect(Object.keys(STATE_LAMP).sort()).toEqual(Object.keys(STATE_BAR).sort())
    expect(STATE_BAR.noReading).toContain('gray')
  })
})

describe('totalsStrip', () => {
  const metric = (label: string): ReadingMetric => ({ label, value: '$0', tone: 'pnl' })

  it('quotes six of Performance’s own readings, in the strip’s order', () => {
    const out = totalsStrip([
      metric('Profit factor'),
      metric('Realized'),
      metric('Profitability · total P&L'),
      metric('Unrealized'),
      metric('Net of fees'),
      metric('Commissions'),
      metric('Cash flows excluded'),
    ])
    expect(out.map((m) => m.label)).toEqual([
      'Total P&L',
      'Realized',
      'Unrealized',
      'Net of fees',
      'Commissions',
      'Net cash flow',
    ])
  })

  it('drops a reading that stopped existing rather than printing a blank', () => {
    // If Performance renames a metric this strip goes short, which is visible.
    // A placeholder would look like a figure of zero, which is not.
    expect(totalsStrip([metric('Realized')]).map((m) => m.label)).toEqual(['Realized'])
    expect(totalsStrip([])).toEqual([])
  })
})
