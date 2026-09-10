import { describe, it, expect } from 'vitest'
import {
  ATM_BAND_PCT,
  EXPIRY_BUCKET_LABEL,
  NEAR_EXPIRY_DAYS,
  THETA_BURN_DAYS,
  dteToneClass,
  expiryBucket,
  moneynessBadgeClass,
  moneynessFromPct,
  moneynessPct,
  moneynessTone,
  moneynessToneClass,
  vrpBandLabel,
} from './optionSemantics'

describe('moneynessPct', () => {
  it('orients calls and puts so positive always means in-the-money', () => {
    // Spot 100, strike 90: the call is ITM, the put is OTM by the same distance.
    expect(moneynessPct(100, 90, true)).toBeCloseTo(10)
    expect(moneynessPct(100, 90, false)).toBeCloseTo(-10)
  })

  it('is null when spot or strike is unusable — unknown, not zero', () => {
    expect(moneynessPct(null, 90, true)).toBeNull()
    expect(moneynessPct(100, null, true)).toBeNull()
    expect(moneynessPct(0, 90, true)).toBeNull()
    expect(moneynessPct(Number.NaN, 90, true)).toBeNull()
  })

  it('refuses to invent a moneyness from a non-finite strike', () => {
    // The inline version this replaced coerced these and answered confidently:
    // a null strike read as ITM on a call, NaN and Infinity as OTM. `strike` is
    // typed `number`, but the row comes from a passthrough schema and the same
    // file guards Number.isFinite(row.strike) elsewhere, so the case is real.
    for (const strike of [Number.NaN, Infinity, -Infinity, null, undefined]) {
      expect(moneynessFromPct(moneynessPct(223.67, strike, true))).toBeNull()
      expect(moneynessFromPct(moneynessPct(223.67, strike, false))).toBeNull()
    }
  })
})

describe('moneynessFromPct', () => {
  it('calls the ATM band by ATM_BAND_PCT', () => {
    expect(moneynessFromPct(ATM_BAND_PCT - 0.01)).toBe('ATM')
    expect(moneynessFromPct(-(ATM_BAND_PCT - 0.01))).toBe('ATM')
    expect(moneynessFromPct(ATM_BAND_PCT)).toBe('ITM')
    expect(moneynessFromPct(-ATM_BAND_PCT)).toBe('OTM')
  })

  it('is null for an unknown distance', () => {
    expect(moneynessFromPct(null)).toBeNull()
    expect(moneynessFromPct(Number.NaN)).toBeNull()
  })
})

describe('moneynessTone — the rule the two pages had each worked out privately', () => {
  it('ITM is intrinsic value when long and assignment risk when short', () => {
    expect(moneynessTone('ITM', 'long')).toBe('favourable')
    expect(moneynessTone('ITM', 'short')).toBe('adverse')
  })

  it('preserves what each page rendered before it was consolidated', () => {
    // OptionContractDetailPanel showed a buyable contract's ITM in success green.
    expect(moneynessToneClass(moneynessTone('ITM', 'long'))).toBe('text-success')
    // BookVsBaseCockpit showed ITM short legs in loss red.
    expect(moneynessToneClass(moneynessTone('ITM', 'short'))).toBe('text-loss')
  })

  it('stays quiet on OTM for both sides — a seller book is all OTM', () => {
    expect(moneynessTone('OTM', 'long')).toBe('neutral')
    expect(moneynessTone('OTM', 'short')).toBe('neutral')
  })

  it('treats ATM as the pivot regardless of side', () => {
    expect(moneynessTone('ATM', 'long')).toBe('pivot')
    expect(moneynessTone('ATM', 'short')).toBe('pivot')
  })

  it('says nothing when moneyness is unknown', () => {
    expect(moneynessTone(null, 'short')).toBe('neutral')
    expect(moneynessToneClass(moneynessTone(null, 'long'))).toBe('text-muted-foreground')
  })
})

describe('moneynessBadgeClass', () => {
  it('keeps the pill the detail panel already rendered', () => {
    expect(moneynessBadgeClass('ITM', 'long')).toBe('border-success/40 bg-success-soft text-success')
    expect(moneynessBadgeClass('OTM', 'long')).toBe(
      'border-muted-foreground/40 bg-muted text-muted-foreground',
    )
    expect(moneynessBadgeClass('ATM', 'long')).toBe('border-primary/50 bg-primary/10')
  })

  it('gives the short side its own adverse pill', () => {
    expect(moneynessBadgeClass('ITM', 'short')).toBe('border-loss/40 bg-danger-soft text-loss')
  })
})

describe('expiryBucket', () => {
  it('buckets by the near-expiry window rather than a loose 7', () => {
    expect(expiryBucket(-1)).toBe('expired')
    expect(expiryBucket(0)).toBe('this_week')
    expect(expiryBucket(NEAR_EXPIRY_DAYS)).toBe('this_week')
    expect(expiryBucket(NEAR_EXPIRY_DAYS + 1)).toBe('next_week')
    expect(expiryBucket(14)).toBe('next_week')
    expect(expiryBucket(15)).toBe('this_month')
    expect(expiryBucket(35)).toBe('this_month')
    expect(expiryBucket(36)).toBe('later')
  })

  it('treats an unknown dte as later, never as expired', () => {
    expect(expiryBucket(null)).toBe('later')
    expect(expiryBucket(undefined)).toBe('later')
    expect(expiryBucket(Number.NaN)).toBe('later')
  })

  it('labels the near bucket with the constant it uses', () => {
    expect(EXPIRY_BUCKET_LABEL.this_week).toBe(`≤ ${NEAR_EXPIRY_DAYS} days`)
  })
})

describe('dteToneClass', () => {
  it('reddens past expiry and warns inside the near window', () => {
    expect(dteToneClass(-1)).toBe('text-loss')
    expect(dteToneClass(0)).toBe('text-warning')
    expect(dteToneClass(NEAR_EXPIRY_DAYS)).toBe('text-warning')
    expect(dteToneClass(NEAR_EXPIRY_DAYS + 1)).toBeUndefined()
  })

  it('is silent on an unknown dte', () => {
    expect(dteToneClass(null)).toBeUndefined()
    expect(dteToneClass(Number.NaN)).toBeUndefined()
  })
})

describe('theta burn window', () => {
  it('is tighter than the roll-scheduling window, and deliberately so', () => {
    expect(THETA_BURN_DAYS).toBeLessThan(NEAR_EXPIRY_DAYS)
  })
})

describe('vrpBandLabel', () => {
  it('reproduces the cockpit bands', () => {
    expect(vrpBandLabel(80)).toBe('Elevated VRP')
    expect(vrpBandLabel(79.9)).toBe('Neutral VRP')
    expect(vrpBandLabel(50)).toBe('Neutral VRP')
    expect(vrpBandLabel(20)).toBe('Compressed VRP')
    expect(vrpBandLabel(19.9)).toBe('Deep negative VRP')
    expect(vrpBandLabel(-5)).toBe('Deep negative VRP')
  })

  it('is null when there is no percentile, not "deep negative"', () => {
    expect(vrpBandLabel(null)).toBeNull()
    expect(vrpBandLabel(Number.NaN)).toBeNull()
  })
})
