import { describe, expect, it } from 'vitest'
import type { PcrRow } from '@/api/research/pcr'
import { deepEnough } from './pcrDepth'

const row = (d: string, pv: number | null, putV: number, callV: number): PcrRow => ({
  symbol: 'PLTR',
  trade_date: d,
  pcr_volume: pv,
  pcr_oi: null,
  total_put_volume: putV,
  total_call_volume: callV,
})

describe('deepEnough', () => {
  it('leaves out a ratio computed off a handful of contracts', () => {
    // PLTR 2026-05-29 read 48.00 off 48 puts and 1 call; August sessions carry ~400k.
    const rows = [
      row('2026-05-29', 48, 48, 1),
      ...Array.from({ length: 30 }, (_, i) => row(`2026-08-${String(i + 1).padStart(2, '0')}`, 0.8, 180_000, 225_000)),
    ]
    const { kept, thin } = deepEnough(rows, 'pcr_volume')
    expect(thin).toBe(1)
    expect(kept).toHaveLength(30)
    expect(kept.every((r) => r.pcr_volume === 0.8)).toBe(true)
  })

  it('skips rows without the ratio and keeps a uniformly deep year whole', () => {
    const rows = [row('2026-09-01', null, 0, 0), row('2026-09-02', 0.9, 100, 110), row('2026-09-03', 1.1, 120, 110)]
    expect(deepEnough(rows, 'pcr_volume')).toEqual({ kept: rows.slice(1), thin: 0 })
  })
})
