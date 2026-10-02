import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSkewExtremes } from '@/api/research/volSurface'
import { fetchVrpExtremes } from '@/api/research/vrp'
import { parseLeftOut } from '@/lib/researchParseHelpers'

/**
 * Skew and VRP extremes rank one session (research 0.137.0) and name the ones
 * it left out. Every figure here is invented.
 */
function answer(data: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ ok: true, data }), { status: 200 })),
  )
}

describe('latest-session extremes', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads the ranked count and the names left out, with their reason', async () => {
    answer({
      rows: [{ symbol: 'nvda', trade_date: '2026-08-25', expiry: '2026-09-18', atm_slope: 0.04 }],
      count: 1,
      limit: 100,
      as_of: '2026-08-25',
      ranked: 212,
      excluded: [
        { symbol: 'amd', trade_date: '2026-08-24', reason: 'no_30d_fit' },
        { symbol: 'INTC', trade_date: '2026-08-11', reason: 'not_fit' },
      ],
    })
    const r = await fetchSkewExtremes(100)
    expect(r.ranked).toBe(212)
    expect(r.excluded).toEqual([
      { symbol: 'AMD', trade_date: '2026-08-24', reason: 'no_30d_fit' },
      { symbol: 'INTC', trade_date: '2026-08-11', reason: 'not_fit' },
    ])
  })

  it('reads how each skew slope was taken, and an older API as unknown', async () => {
    answer({
      rows: [
        {
          symbol: 'xel',
          trade_date: '2026-09-29',
          expiry: '2026-10-16',
          dte: 30,
          atm_slope: 0.01,
          basis: 'interpolated',
          short_expiry: '2026-10-16',
          short_dte: 17,
          long_expiry: '2026-11-20',
          long_dte: 52,
          svi_a: null,
        },
        { symbol: 'ia', trade_date: '2026-09-29', expiry: '2026-10-16', dte: 21, atm_slope: 0.09, basis: 'window' },
        { symbol: 'nvda', trade_date: '2026-09-29', expiry: '2026-10-30', atm_slope: 0.02 },
      ],
      count: 3,
      limit: 100,
      as_of: '2026-09-29',
      ranked: 656,
      excluded: [],
    })
    const [xel, ia, nvda] = (await fetchSkewExtremes(100)).rows
    expect(xel).toMatchObject({ symbol: 'XEL', basis: 'interpolated', dte: 30, short_dte: 17, long_dte: 52, svi_a: null })
    expect(xel?.long_expiry).toBe('2026-11-20')
    expect(ia).toMatchObject({ basis: 'window', short_expiry: null, long_dte: null })
    expect(nvda?.basis).toBeNull()
  })

  it('reads an older research API as nothing left out and no count', async () => {
    answer({ rows: [], count: 0, bucket: 'high', limit: 20, as_of: '2026-08-25' })
    const r = await fetchVrpExtremes('high', 20)
    expect(r.ranked).toBeNull()
    expect(r.excluded).toEqual([])
  })

  it('keeps VRP reasons as the endpoint words them', async () => {
    answer({
      rows: [],
      count: 0,
      bucket: 'low',
      limit: 20,
      as_of: '2026-08-25',
      ranked: 0,
      excluded: [{ symbol: 'AMD', trade_date: '2026-07-30', reason: 'not_computed' }],
    })
    const r = await fetchVrpExtremes('low', 20)
    expect(r.ranked).toBe(0)
    expect(r.excluded[0]?.reason).toBe('not_computed')
  })
})

describe('parseLeftOut', () => {
  it('drops entries without a symbol and names a missing reason', () => {
    expect(parseLeftOut([{ symbol: ' ', reason: 'not_fit' }, null, { symbol: 'amd' }])).toEqual([
      { symbol: 'AMD', trade_date: null, reason: 'unknown' },
    ])
    expect(parseLeftOut(undefined)).toEqual([])
  })
})
