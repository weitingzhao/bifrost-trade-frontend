import { describe, expect, it } from 'vitest'
import type { TerrainIntraday } from '@/api/researchEngine'
import { flatSession, invalidation, leadBranch, spotSourceOf, transitionsOf } from './playbookBranches'

const row = (over: Partial<TerrainIntraday>): TerrainIntraday => ({
  symbol: 'XYZ',
  trade_date: '2026-09-28',
  asof_ts: '2026-09-28T14:45:00+00:00',
  pin_score: 40,
  trend_release: 60,
  vol_squeeze: 50,
  tail_risk: 10,
  expected_close: 100,
  gamma_zone_low: 98,
  gamma_zone_high: 102,
  regime: 'range',
  spot: 100,
  inputs_json: {},
  computed_at: '2026-09-28T14:45:05+00:00',
  prob_rangy: 0.4,
  prob_bull: 0.3,
  prob_bear: 0.1,
  prob_squeeze: 0.2,
  ...over,
})

describe('playbook branches', () => {
  it('calls a session flat only when every snapshot is the same', () => {
    expect(flatSession([row({}), row({ asof_ts: '2026-09-28T15:45:00+00:00' })])).toBe(true)
    expect(flatSession([row({}), row({ spot: 100.5 })])).toBe(false)
    expect(flatSession([row({}), row({ prob_bull: 0.35, prob_rangy: 0.35 })])).toBe(false)
    // One snapshot says nothing about whether the session moved.
    expect(flatSession([row({})])).toBe(false)
  })

  it('leads with the highest probability and names what overturns it from the snapshot', () => {
    expect(leadBranch(row({}))).toBe('rangy')
    expect(leadBranch(row({ prob_bull: 0.5, prob_rangy: 0.2 }))).toBe('bull')
    expect(invalidation('rangy', row({}))).toBe('a break below 98.00 or above 102.00')
    expect(invalidation('bull', row({}))).toBe("a fall back through the zone's midpoint 100.00")
    expect(invalidation('bear', row({}))).toBe("a reclaim of the zone's midpoint 100.00")
    expect(invalidation('squeeze', row({}))).toBe('spot leaving the gamma zone 98.00–102.00')
  })

  it('reads the spot source the terrain stamped, and nothing it did not', () => {
    expect(spotSourceOf(row({ inputs_json: { spot_source: 'parity' } }))).toBe('parity')
    expect(spotSourceOf(row({ inputs_json: { spot_source: 'prior_close' } }))).toBe('prior_close')
    expect(spotSourceOf(row({}))).toBeNull()
  })

  it('lists each regime change with the spot it happened at', () => {
    const rows = [
      row({}),
      row({ asof_ts: '2026-09-28T15:45:00+00:00', regime: 'trending', spot: 101.25 }),
      row({ asof_ts: '2026-09-28T16:45:00+00:00', regime: 'trending', spot: 101.5 }),
    ]
    expect(transitionsOf(rows)).toEqual([{ time: '15:45', txt: 'range → trending · 101.25' }])
  })
})
