import { describe, it, expect } from 'vitest'
import {
  MARGIN_CRITICAL,
  marginBand,
  readMarginFacts,
  rollupMargin,
  summaryNum,
} from './marginPressure'

// Shape and values taken from the live DEV snapshot on 2026-09-05.
const HOST = {
  account_id: 'U17123565',
  summary: {
    NetLiquidation: '644944.21',
    EquityWithLoanValue: '682554.57',
    MaintMarginReq: '214021.13',
    ExcessLiquidity: '468859.46',
    Cushion: '0.726977',
    BuyingPower: '1874133.76',
    GrossPositionValue: '705466.50',
  },
}
const SECONDARY = {
  account_id: 'U8829175',
  summary: {
    NetLiquidation: '376390.56',
    EquityWithLoanValue: '379354.10',
    MaintMarginReq: '93875.02',
    ExcessLiquidity: '285479.08',
    Cushion: '0.758465',
    BuyingPower: '1141916.31',
    GrossPositionValue: '378463.62',
  },
}
/** IB returns a funded-looking row of zeroes for an account with nothing in it. */
const EMPTY = {
  account_id: 'U17113214',
  summary: { NetLiquidation: '0.0', MaintMarginReq: '0.00', ExcessLiquidity: '0.00', Cushion: '1' },
}

describe('summaryNum', () => {
  it('parses the comma-grouped strings IB sends', () => {
    expect(summaryNum({ X: '1,874,133.76' }, 'X')).toBeCloseTo(1874133.76, 6)
  })
  it('returns null rather than 0 for missing or blank', () => {
    expect(summaryNum({ X: '' }, 'X')).toBeNull()
    expect(summaryNum(undefined, 'X')).toBeNull()
    expect(summaryNum({ X: 'n/a' }, 'X')).toBeNull()
  })
})

describe('readMarginFacts', () => {
  it('takes the broker’s Cushion verbatim rather than deriving it', () => {
    const f = readMarginFacts(HOST)
    expect(f.cushion).toBeCloseTo(0.726977, 6)
    expect(f.pressure).toBeCloseTo(1 - 0.726977, 6)
  })

  it('keeps maint/NLV under its own name — it is NOT 1 − cushion', () => {
    // Measured on DEV: 0.3318 vs 0.2730. Passing one off as the other would put
    // a headroom number on screen that the broker does not act on.
    const f = readMarginFacts(HOST)
    expect(f.maintToNlv).toBeCloseTo(214021.13 / 644944.21, 10)
    expect(Math.abs((f.maintToNlv as number) - (f.pressure as number))).toBeGreaterThan(0.05)
  })

  it('falls back to ExcessLiquidity / NetLiquidation when Cushion is absent', () => {
    const noCushion = { account_id: 'U1', summary: { ...HOST.summary, Cushion: '' } }
    expect(readMarginFacts(noCushion).cushion).toBeCloseTo(468859.46 / 644944.21, 10)
  })

  it('declines to divide by an unfunded account', () => {
    // IB reports Cushion 1 on an empty account; pressure 0 is correct there.
    expect(readMarginFacts(EMPTY).maintToNlv).toBeNull()
  })
})

describe('rollupMargin', () => {
  it('sums the funded accounts and drops the empty one', () => {
    const r = rollupMargin([HOST, SECONDARY, EMPTY])
    expect(r.accounts).toHaveLength(2)
    expect(r.netLiquidation).toBeCloseTo(1021334.77, 2)
    expect(r.maintMarginReq).toBeCloseTo(307896.15, 2)
    // Summed excess over summed net liq, not an average of the two ratios.
    expect(r.pressure).toBeCloseTo(1 - (468859.46 + 285479.08) / 1021334.77, 10)
  })

  it('names the most-loaded account, because margin does not net across them', () => {
    const r = rollupMargin([HOST, SECONDARY])
    // A blended ratio can look calm while one account is the one being liquidated.
    expect(r.tightest?.accountId).toBe('U17123565')
  })

  it('handles an empty book without dividing by zero', () => {
    const r = rollupMargin([])
    expect(r.pressure).toBeNull()
    expect(r.tightest).toBeNull()
  })
})

describe('marginBand', () => {
  it('puts critical at the broker’s own trigger side', () => {
    expect(marginBand(0)).toBe('idle')
    expect(marginBand(0.3)).toBe('normal')
    expect(marginBand(0.5)).toBe('heavy')
    expect(marginBand(MARGIN_CRITICAL)).toBe('critical')
    expect(marginBand(1)).toBe('critical')
  })
  it('honours overridden bands', () => {
    expect(marginBand(0.3, 0.2, 0.9)).toBe('heavy')
  })
})
