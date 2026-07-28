import { describe, expect, it } from 'vitest'
import {
  computeOptMidAndLivePnl,
  normalizeIbOptionAvgCostPerShare,
  resolveOptAvgCostPerShareForMtm,
} from './optionLiveBasis'

describe('normalizeIbOptionAvgCostPerShare', () => {
  it('keeps already-$/share values (< $10)', () => {
    expect(normalizeIbOptionAvgCostPerShare(0.11)).toBeCloseTo(0.11)
    expect(normalizeIbOptionAvgCostPerShare(3.19)).toBeCloseTo(3.19)
  })

  it('converts IB contract cost (≥ $10) to $/share', () => {
    // Live Host book: IB sends premium × 100
    expect(normalizeIbOptionAvgCostPerShare(111.29365555)).toBeCloseTo(1.1129365555)
    expect(normalizeIbOptionAvgCostPerShare(319.29983335)).toBeCloseTo(3.1929983335)
    expect(normalizeIbOptionAvgCostPerShare(491.28582)).toBeCloseTo(4.9128582)
    expect(normalizeIbOptionAvgCostPerShare(1459.9193)).toBeCloseTo(14.599193)
    expect(normalizeIbOptionAvgCostPerShare(-1460)).toBeCloseTo(-14.6)
  })
})

describe('resolveOptAvgCostPerShareForMtm', () => {
  it('prefers FIFO basis without ×100 unwind', () => {
    expect(
      resolveOptAvgCostPerShareForMtm(
        { avg_cost: 1459.92 },
        { avgPerShare: 14.5992, basisSource: 'flex_trades' },
      ),
    ).toBeCloseTo(14.5992)
  })

  it('falls back to IB avgCost with contract→$/share normalize', () => {
    expect(resolveOptAvgCostPerShareForMtm({ avg_cost: 1459.9193 }, undefined)).toBeCloseTo(14.599193)
    expect(resolveOptAvgCostPerShareForMtm({ avg_cost: 319.29983335 }, undefined)).toBeCloseTo(
      3.1929983335,
    )
  })
})

describe('computeOptMidAndLivePnl MRVL-style short', () => {
  it('uses IB contract avgCost 1459.92 → $14.60/sh', () => {
    const { livePnl } = computeOptMidAndLivePnl(
      { qty: -1, avg_cost: 1459.9193, right: 'P' },
      { mid: 22.25 },
      undefined,
    )
    // (22.25 - 14.599193) * (-1) * 100 ≈ -765
    expect(livePnl).toBeCloseTo((22.25 - 14.599193) * -1 * 100, 1)
  })
})
