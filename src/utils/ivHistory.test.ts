import { describe, expect, it } from 'vitest'
import type { VrpRow } from '@/api/research/vrp'
import {
  MIN_IV_POINTS,
  coneRows,
  coneStory,
  coverageLine,
  ivAtTenor,
  ivReading,
  signedVolPts,
  suspectIvDates,
  suspectLine,
  volPts,
  windowRows,
} from '@/utils/ivHistory'

/** Invented series — dates are sessions only in name. */
function rows(n: number, opts: { ivFrom?: number; iv?: (i: number) => number; rv?: (i: number) => number } = {}): VrpRow[] {
  const ivFrom = opts.ivFrom ?? 0
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2025, 0, 1) + i * 86_400_000).toISOString().slice(0, 10)
    const iv = i >= ivFrom ? (opts.iv ?? (() => 0.4))(i) : null
    const rv = (opts.rv ?? (() => 0.35))(i)
    return {
      symbol: 'TEST',
      trade_date: d,
      rv_20d: rv,
      rv_60d: null,
      rv_252d: null,
      atm_iv_30d: iv,
      vrp_20d: iv == null ? null : iv - rv,
      vrp_60d: null,
      vrp_pct_252d: null,
      fwd_ret_20d: null,
      computed_at: null,
    }
  })
}

describe('windows are sessions, newest last', () => {
  it('takes the newest sessions the window asks for, in date order', () => {
    const shuffled = rows(100).reverse()
    const w = windowRows(shuffled, '3m')
    expect(w).toHaveLength(63)
    expect(w[0].trade_date! < w[62].trade_date!).toBe(true)
    expect(w[62].trade_date).toBe(rows(100)[99].trade_date)
  })

  it('holds what the store has when the window asks for more', () => {
    // DEV: the vrp store answers 251 sessions however many are asked for.
    expect(windowRows(rows(251), '2y')).toHaveLength(251)
  })
})

describe('ivReading', () => {
  it('reads the newest row as the store wrote it — nothing recomputed', () => {
    const r = ivReading(rows(80, { iv: () => 0.464, rv: () => 0.5057 }), '3m')
    expect(r.iv30).toBeCloseTo(0.464)
    expect(r.rv20).toBeCloseTo(0.5057)
    expect(r.vrp20).toBeCloseTo(0.464 - 0.5057)
  })

  it('states the percentile as the share of the window at or below today', () => {
    // 63 sessions of IV rising 0.30 → 0.92; today is the top of its window.
    const r = ivReading(rows(63, { iv: (i) => 0.3 + i * 0.01 }), '3m')
    expect(r.percentile).toBe(100)
    expect(r.band!.lo).toBeLessThan(r.band!.hi)
  })

  it('withholds the percentile over too few implied readings', () => {
    // AMD on DEV: eleven days of IV30. A rank over eleven days is not a rank
    // against the name's past.
    const r = ivReading(rows(63, { ivFrom: 63 - (MIN_IV_POINTS - 1) }), '3m')
    expect(r.ivPoints).toBe(MIN_IV_POINTS - 1)
    expect(r.percentile).toBeNull()
    expect(r.band).toBeNull()
  })

  it('counts IV over RV only on days holding both', () => {
    const r = ivReading(
      rows(63, { ivFrom: 23, iv: (i) => (i % 2 === 0 ? 0.5 : 0.3), rv: () => 0.4 }),
      '3m',
    )
    expect(r.bothPoints).toBe(40)
    expect(r.ivAboveRv).toBeCloseTo(0.5)
  })
})

describe('suspect IV30 readings are named, never ranked', () => {
  // The shapes measured on DEV 2026-09-23 (PLTR): 0.074 → 2.256 → 0.544, and
  // 2.642 between 0.566 and 0.040. Values here are invented to match them.
  const spiky = () =>
    rows(63, {
      iv: (i) => (i === 20 ? 2.6 : i === 21 ? 0.04 : i === 40 ? 0.45 * 2.5 : 0.45 + (i % 3) * 0.01),
    })

  it('catches a spike, a floor breach and a dip, and nothing else', () => {
    const r = spiky()
    expect(suspectIvDates(r)).toEqual([r[20].trade_date, r[21].trade_date, r[40].trade_date])
  })

  it('judges an edge reading on the floor only — today is not a spike until tomorrow', () => {
    const r = rows(30, { iv: (i) => (i === 29 ? 1.9 : 0.4) })
    expect(suspectIvDates(r)).toEqual([])
    const low = rows(30, { iv: (i) => (i === 29 ? 0.03 : 0.4) })
    expect(suspectIvDates(low)).toEqual([low[29].trade_date])
  })

  it('withholds the percentile, the band and the share while any sit in the window', () => {
    const reading = ivReading(spiky(), '3m')
    expect(reading.suspects).toHaveLength(3)
    expect(reading.percentile).toBeNull()
    expect(reading.band).toBeNull()
    expect(reading.ivAboveRv).toBeNull()
    expect(suspectLine(reading)).toMatch(/^3 IV30 readings in this window look like faults in the store/)
  })

  it('does not repair or drop them — the chart and the counts still carry every reading', () => {
    const reading = ivReading(spiky(), '3m')
    expect(reading.ivPoints).toBe(63)
  })

  it('says nothing over a clean window', () => {
    expect(suspectLine(ivReading(rows(63), '3m'))).toBeNull()
  })
})

describe('coverageLine says which half of the past is missing', () => {
  it('is silent over a whole window', () => {
    expect(coverageLine(ivReading(rows(63), '3m'))).toBeNull()
  })

  it('names a young implied history', () => {
    const line = coverageLine(ivReading(rows(126, { ivFrom: 54 }), '6m'))
    expect(line).toMatch(/^IV30 covers 72 of those sessions, from 2025-02-24\.$/)
  })

  it('names a store shallower than the window, separately', () => {
    const line = coverageLine(ivReading(rows(251, { ivFrom: 179 }), '2y'))
    expect(line).toMatch(/store holds 251 of the 504 sessions/)
    expect(line).toMatch(/IV30 covers 72 of those sessions/)
  })

  it('says so when implied vol has no readings at all', () => {
    expect(coverageLine(ivReading(rows(63, { ivFrom: 999 }), '3m'))).toMatch(/IV30 has no readings in it/)
  })
})

describe('vol points', () => {
  it('prints a fraction as vol points, and a missing one as a dash', () => {
    expect(volPts(0.4644)).toBe('46.4')
    expect(volPts(null)).toBe('—')
    expect(signedVolPts(-0.0413)).toBe('−4.1')
    expect(signedVolPts(0.069)).toBe('+6.9')
  })
})

describe('ivAtTenor', () => {
  const term = [
    { dte: 3, iv: 0.49 },
    { dte: 10, iv: 0.466 },
    { dte: 24, iv: 0.458 },
    { dte: 59, iv: 0.47 },
  ]

  it('reads a listed expiry as itself', () => {
    expect(ivAtTenor(term, 10)).toBeCloseTo(0.466)
  })

  it('interpolates in total variance between the expiries around a horizon', () => {
    const v = ivAtTenor(term, 20)!
    const expected = Math.sqrt((0.466 ** 2 * 10 + ((0.458 ** 2 * 24 - 0.466 ** 2 * 10) * 10) / 14) / 20)
    expect(v).toBeCloseTo(expected, 6)
  })

  it('never extrapolates past the listed range', () => {
    // A dot on the cone is a measurement; an extrapolated one would look the same.
    expect(ivAtTenor(term, 90)).toBeNull()
    expect(ivAtTenor(term, 2)).toBeNull()
    expect(ivAtTenor([], 30)).toBeNull()
  })
})

describe('the cone, counted', () => {
  const tenors = [10, 20, 30, 60, 90].map((days) => ({
    days,
    n: 400,
    p05: 0.2,
    p20: 0.3,
    p50: 0.4,
    p80: 0.5,
    p95: 0.6,
  }))

  it('places implied vol against realised by horizon', () => {
    const term = [
      { dte: 10, iv: 0.55 },
      { dte: 30, iv: 0.45 },
      { dte: 60, iv: 0.35 },
    ]
    const rows = coneRows(tenors, term)
    expect(rows.map((r) => r.place)).toEqual([
      'above-p80',
      'above-median',
      'above-median',
      'below-median',
      'unread',
    ])
    const story = coneStory(rows)
    expect(story).toContain('above the median realised vol at 3 of 4 horizons')
    expect(story).toContain('above the 80th percentile at 1 (10d)')
    expect(story).toContain('1 horizon has no listed expiry around it')
  })

  it('says when nothing can be placed rather than drawing an empty cone as calm', () => {
    expect(coneStory(coneRows(tenors, []))).toMatch(/not placed on the cone/)
  })
})
