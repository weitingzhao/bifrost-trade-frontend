import { describe, expect, it } from 'vitest'
import type { EarningsMoves, EarningsPrint } from '@/api/research/vrp'
import {
  crushText,
  earningsStory,
  printLabel,
  printMarks,
  pricedPct,
  ratioBarWidth,
  ratioText,
  setAsideLine,
} from './earningsText'

// Invented numbers, shaped like the route's rows.
function row(filed: string, priced: number | null, actual: number | null, direction: EarningsPrint['direction'] = 'up'): EarningsPrint {
  return {
    filed,
    before: null,
    after: null,
    actual,
    direction,
    priced,
    ratio: priced != null && actual != null ? Math.round((actual / priced) * 10_000) / 10_000 : null,
    crush_pts: -10,
    expiry: null,
    crush_expiry: null,
    missing: priced == null ? 'no ATM IV for an expiry covering the print' : null,
  }
}

function moves(prints: EarningsPrint[], over: Partial<EarningsMoves> = {}): EarningsMoves {
  const ratios = prints.map((p) => p.ratio).filter((r): r is number => r != null)
  const sorted = [...ratios].sort((a, b) => a - b)
  const mid = sorted.length ? (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2 : null
  return {
    symbol: 'ZZZ',
    filing_days: 12,
    prints,
    n: ratios.length,
    median_ratio: mid,
    rich: ratios.filter((r) => r < 1).length,
    set_aside: [],
    ...over,
  }
}

describe('earnings moves text', () => {
  it('labels a print the way the design does', () => {
    expect(printLabel('2031-08-03')).toBe('3 Aug 31')
    expect(printLabel('2031-11-18')).toBe('18 Nov 31')
  })

  it('reads the straddle as a range and the ratio as a multiple', () => {
    expect(pricedPct(0.114)).toBe('±11.4%')
    expect(ratioText(0.6541)).toBe('0.65×')
    expect(pricedPct(null)).toBe('—')
  })

  it('spans the bar over 0–2× with fair at the middle', () => {
    expect(ratioBarWidth(1)).toBe(50)
    expect(ratioBarWidth(0.5)).toBe(25)
    expect(ratioBarWidth(2.6)).toBe(100)
    expect(ratioBarWidth(null)).toBe(0)
  })

  it('rounds the crush to whole points with a real minus', () => {
    expect(crushText(-21.55)).toBe('−22 pts')
    expect(crushText(3.2)).toBe('+3 pts')
    expect(crushText(null)).toBe('—')
  })

  it('names the prints the straddle under-priced', () => {
    const m = moves([row('2031-08-03', 0.1, 0.3), row('2031-05-04', 0.1, 0.05, 'down'), row('2031-02-02', 0.1, 0.07)])
    const s = earningsStory(m)
    expect(s).toContain('Median actual / priced 0.70× over 3 prints')
    expect(s).toContain('rich here 2 times out of 3')
    expect(s).toContain('The miss: 3 Aug 31 (up 30.0% against ±10.0%)')
  })

  it('counts the prints it could not price', () => {
    const s = earningsStory(moves([row('2031-08-03', 0.1, 0.05), row('2031-05-04', null, 0.05)]))
    expect(s).toContain('over 1 print —')
    expect(s).toContain('1 of 2 prints could not be priced')
  })

  it('says a name outside the 8-K feed is outside it, not quiet', () => {
    expect(earningsStory(moves([], { filing_days: 0 }))).toMatch(/No 8-K on file for ZZZ/)
    expect(earningsStory(moves([], { filing_days: 5 }))).toMatch(/none carries Item 2\.02/)
  })

  it('names the filings set aside over the span the table shows', () => {
    const m = moves([row('2031-07-22', 0.1, 0.05), row('2031-04-22', 0.1, 0.05)], {
      set_aside: [
        { filed: '2031-07-02', release: '2031-07-22', reason: '' },
        { filed: '2031-04-02', release: '2031-04-22', reason: '' },
        { filed: '2031-01-02', release: '2031-01-28', reason: '' },
      ],
    })
    const s = setAsideLine(m)
    expect(s).toContain('2 Item 2.02 filings are not counted as prints: 2 Jul 31, 2 Apr 31.')
    expect(s).not.toContain('Jan')
    expect(setAsideLine(moves([row('2031-07-22', 0.1, 0.05)]))).toBeNull()
  })

  it('says when a set-aside filing has no release after it yet', () => {
    const m = moves([row('2031-07-22', 0.1, 0.05)], { set_aside: [{ filed: '2031-10-02', release: null, reason: '' }] })
    expect(setAsideLine(m)).toContain('2 Oct 31 has no release after it yet')
  })

  it('reads a route older than 0.123.0 as nothing set aside', () => {
    const m = moves([row('2031-07-22', 0.1, 0.05)])
    delete m.set_aside
    expect(setAsideLine(m)).toBeNull()
  })

  it('marks each print on its filing date', () => {
    expect(printMarks(moves([row('2031-08-03', 0.1, 0.3)]))).toEqual([
      { date: '2031-08-03', label: 'E', title: 'Earnings — 8-K Item 2.02 filed 2031-08-03' },
    ])
    expect(printMarks(null)).toEqual([])
  })
})
