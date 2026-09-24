import { describe, expect, it } from 'vitest'
import type { DailyBar } from '@/api/marketData/dailyBars'
import {
  coneRows,
  ivPercentile,
  ivRank,
  methodTable,
  percentileSpread,
  returnsFrom,
  volSamples,
  windowVol,
} from './labHistoryModel'

// Invented bars: a flat 1%-per-day sawtooth so the vol is known by hand.
function bars(n: number, dailyRet = 0.01): DailyBar[] {
  const out: DailyBar[] = []
  let c = 100
  for (let i = 0; i < n; i++) {
    const next = c * Math.exp(i % 2 === 0 ? dailyRet : -dailyRet)
    out.push({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      open: c,
      high: Math.max(c, next) * 1.001,
      low: Math.min(c, next) * 0.999,
      close: next,
    })
    c = next
  }
  return out
}

describe('the estimators', () => {
  it('computes close-to-close on returns alone, and refuses a range estimator without the range', () => {
    const rets = returnsFrom(bars(40))
    const cc = windowVol(rets.slice(-20), 'cc', 252)
    expect(cc).not.toBeNull()
    // A ±1% sawtooth annualises near 16 vol points (1% · √252).
    expect(cc!).toBeGreaterThan(12)
    expect(cc!).toBeLessThan(20)
    const noRange = rets.map((r) => ({ ...r, h: null }))
    expect(windowVol(noRange.slice(-20), 'park', 252)).toBeNull()
    expect(windowVol(rets.slice(-20), 'park', 252)).not.toBeNull()
    expect(windowVol(rets.slice(-20), 'gk', 252)).not.toBeNull()
  })

  it('reads about 1.6% higher at the 260 convention, as the design\u2019s note says', () => {
    const rets = returnsFrom(bars(60))
    const a = windowVol(rets.slice(-30), 'cc', 252)!
    const b = windowVol(rets.slice(-30), 'cc', 260)!
    expect(b / a).toBeCloseTo(Math.sqrt(260 / 252), 6)
  })
})

describe('sampling and conventions', () => {
  it('draws far fewer samples without overlap, and says so', () => {
    const rets = returnsFrom(bars(130))
    const over = volSamples(rets, 20, 'cc', 252, 'overlap')
    const non = volSamples(rets, 20, 'cc', 252, 'none')
    expect(over.length).toBeGreaterThan(non.length * 3)
  })

  it('keeps rank and percentile as two questions, unclamped outside the sample', () => {
    const s = [10, 20, 30, 40]
    expect(ivRank(s, 25)).toBe(50)
    expect(ivRank(s, 50)).toBeGreaterThan(100)
    expect(ivPercentile(s, 25, 'linear')).toBeCloseTo(50, 6)
    expect(ivPercentile(s, 5, 'linear')).toBe(0)
    expect(ivPercentile(s, 50, 'linear')).toBe(100)
    // The conventions disagree most in the tails — the design's point.
    expect(ivPercentile(s, 39, 'nearest')).toBe(75)
    expect(ivPercentile(s, 39, 'hazen')).toBeCloseTo(62.5, 6)
  })

  it('tables the four windows and reports the spread the page leads with', () => {
    const rets = returnsFrom(bars(520))
    const rows = methodTable(rets, 16, 20, 'cc', 252, 'overlap', 'linear')
    expect(rows.map((r) => r.window)).toEqual(['3m', '6m', '1y', '2y'])
    for (const r of rows) {
      expect(r.n).toBeGreaterThan(0)
      expect(r.effN).toBeLessThanOrEqual(r.n)
    }
    expect(percentileSpread(rows)).not.toBeNull()
  })

  it('draws the cone\u2019s bands in order at every tenor', () => {
    const rets = returnsFrom(bars(520))
    for (const c of coneRows(rets, 'cc', 252, 'overlap')) {
      if (c.p5 == null) continue
      expect(c.p5).toBeLessThanOrEqual(c.p20!)
      expect(c.p20).toBeLessThanOrEqual(c.p50!)
      expect(c.p50).toBeLessThanOrEqual(c.p80!)
      expect(c.p80).toBeLessThanOrEqual(c.p95!)
    }
  })
})
