import { describe, expect, it } from 'vitest'
import { optionCell } from '@/lib/harness/optionCell'

// The shape DEV sends today: every field but VRP.
const TODAY = { status: 'ok', iv_rank_1y: 20.0758, terrain_regime: 'range', total_net_gex: 8402262 }

describe('optionCell (design Rev 2026-09-22.8)', () => {
  it('reads IVR alone until Research emits VRP — not owed, not substituted', () => {
    const c = optionCell(TODAY)
    expect(c.text).toBe('IVR 20')
    expect(c.text).not.toMatch(/owed/)
    // regime is what Rule that fits is judged on and GEX is a dealer reading;
    // either in this cell would duplicate or misplace.
    expect(c.text).not.toMatch(/range|GEX/)
  })

  it('adds VRP as signed vol points the day the field ships', () => {
    expect(optionCell({ ...TODAY, vrp_20d: 0.0336 }).text).toBe('IVR 20 · VRP +3.4')
    expect(optionCell({ ...TODAY, vrp_20d: -0.0349 }).text).toBe('IVR 20 · VRP −3.5')
  })

  it('puts the 252-day percentile in the hover, not the cell', () => {
    const c = optionCell({ ...TODAY, vrp_20d: 0.0336, vrp_pct_252d: 67.5 })
    expect(c.text).not.toMatch(/67/)
    expect(c.title).toMatch(/percentile over 252 days: 68/)
  })

  // 13 of 13 are `ok` today, so this is written against the future.
  it('says no option data when the batch could not read the name', () => {
    expect(optionCell({ status: 'error' }).ok).toBe(false)
    expect(optionCell({ status: 'error' }).text).toBe('no option data')
    expect(optionCell(null).text).toBe('no option data')
  })

  it('does not invent an IV rank that is missing', () => {
    expect(optionCell({ status: 'ok' }).text).toBe('IVR —')
  })
})
