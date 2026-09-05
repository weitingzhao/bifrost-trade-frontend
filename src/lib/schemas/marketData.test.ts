import { describe, it, expect } from 'vitest'
import { OptionSnapshotsResponseSchema } from './marketData'

/** Verbatim from /market/options/snapshots on 2026-09-05 — the Owner's MU call. */
const REAL_RESPONSE = {
  symbol: 'MU',
  expiration: '2026-11-20',
  rows: [
    {
      option_ticker: 'O:MU261120C01200000',
      underlying: 'MU',
      snapshot_ts: '2026-09-04T20:12:02.583000+00:00',
      iv: 0.6644887225946599,
      delta: 0.3547121538415349,
      gamma: 0.001213004339671355,
      theta: -0.7863207463181576,
      vega: 1.7435986856676717,
      open_interest: 1394,
      day_volume: 593,
      day_close: 63.03,
      day_vwap: 55.0838,
      fetched_at: '2026-09-04T22:18:28.173755+00:00',
    },
    {
      option_ticker: 'O:MU260814C00100000',
      underlying: 'MU',
      snapshot_ts: '2026-08-13T18:08:02.186000+00:00',
      iv: null,
      delta: null,
      gamma: null,
      theta: null,
      vega: null,
      open_interest: 7,
      day_volume: 4,
      day_close: 870.92,
      day_vwap: 861.8975,
      fetched_at: '2026-08-13T22:18:28.173755+00:00',
    },
  ],
  count: 2,
  source: 'market.option_snapshot',
}

describe('OptionSnapshotsResponseSchema', () => {
  it('accepts the real response, including rows with no Greeks', () => {
    // A schema that rejected null Greeks would reject roughly a tenth of every
    // chain the vendor returns.
    expect(OptionSnapshotsResponseSchema.safeParse(REAL_RESPONSE).success).toBe(true)
  })

  it('accepts a field the vendor adds later', () => {
    const withExtra = {
      ...REAL_RESPONSE,
      new_vendor_field: 1,
      rows: [{ ...REAL_RESPONSE.rows[0], rho: 0.5 }],
    }
    expect(OptionSnapshotsResponseSchema.safeParse(withExtra).success).toBe(true)
  })

  it('rejects a Greek that changes type — the drift worth catching', () => {
    const drifted = {
      ...REAL_RESPONSE,
      rows: [{ ...REAL_RESPONSE.rows[0], delta: '0.354' }],
    }
    expect(OptionSnapshotsResponseSchema.safeParse(drifted).success).toBe(false)
  })

  it('rejects a row with no ticker to join on', () => {
    const { option_ticker: _drop, ...noTicker } = REAL_RESPONSE.rows[0]
    const broken = { ...REAL_RESPONSE, rows: [noTicker] }
    expect(OptionSnapshotsResponseSchema.safeParse(broken).success).toBe(false)
  })

  it('rejects rows arriving as an object instead of an array', () => {
    const broken = { ...REAL_RESPONSE, rows: { '0': REAL_RESPONSE.rows[0] } }
    expect(OptionSnapshotsResponseSchema.safeParse(broken).success).toBe(false)
  })
})
