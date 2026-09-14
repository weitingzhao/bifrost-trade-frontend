import { describe, expect, it } from 'vitest'
import { DEFAULT_MIN_SOURCE_HIT_RATE, objectiveLeash } from './leash'

const objective = (policy_json: Record<string, unknown> = {}) => ({ id: 'obj-daily-loop-stock', title: 'Daily Loop Stock Explorer', policy_json })
const record = (hit_rate: number | null, judged: number) => [{ id: 'obj-daily-loop-stock', track_record: { hit_rate, judged, horizon_days: 1 } }]

describe('objectiveLeash', () => {
  it('uses the default floor when the objective sets none — DEV, 2026-09-13', () => {
    // Daily Loop Stock Explorer: no min_source_hit_rate in its policy, 50% on 32 settled.
    expect(objectiveLeash([objective()], record(0.5, 32))).toEqual([
      {
        id: 'obj-daily-loop-stock',
        title: 'Daily Loop Stock Explorer',
        floor: DEFAULT_MIN_SOURCE_HIT_RATE,
        floorIsDefault: true,
        hitRate: 0.5,
        judged: 32,
        horizonDays: 1,
        standing: 'clears',
      },
    ])
  })

  it('reads the floor the objective sets', () => {
    expect(objectiveLeash([objective({ min_source_hit_rate: 0.6 })], record(0.5, 32))[0]).toMatchObject({
      floor: 0.6,
      floorIsDefault: false,
      standing: 'below',
    })
  })

  it('calls fewer than five settled outcomes no record, not a pass or a fail', () => {
    expect(objectiveLeash([objective()], record(0.9, 3))[0].standing).toBe('no-record')
    expect(objectiveLeash([objective()], [])[0]).toMatchObject({ hitRate: null, judged: 0, standing: 'no-record' })
  })
})
