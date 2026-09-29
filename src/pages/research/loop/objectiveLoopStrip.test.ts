import { describe, expect, it } from 'vitest'
import { objectiveLoopStrip } from './objectiveLoopStrip'

describe('the Console card Loop line (Rev .102)', () => {
  it('dashes every arc an objective without history has not walked', () => {
    const s = objectiveLoopStrip({ policy_json: {} }, 0, null)
    expect(s.map((x) => [x.id, x.lit])).toEqual([
      ['belief', false],
      ['runs', false],
      ['settled', false],
      ['memory', false],
      ['proposal', false],
    ])
  })

  it('lights runs, own settles and a memory origin', () => {
    const s = objectiveLoopStrip(
      { policy_json: { origin: { kind: 'memory', memory_id: 'M-7', at: '2026-01-02' } } },
      3,
      { status: 'ok', scope: 'objective', horizon_days: 5, hit_rate: 0.5, judged: 4, avg_excess: null },
    )
    expect(s.map((x) => x.label)).toEqual(['no belief yet', '3 runs', '4 settled · 2✓', 'M-7', 'proposed'])
    expect(s[3].to).toBe('/research/trace?m=M-7')
    expect(s[0].tip).toMatch(/Born from memory M-7/)
  })

  it('does not count the harness-wide record as this objective’s settles', () => {
    const s = objectiveLoopStrip({ policy_json: {} }, 1, { status: 'ok', scope: 'source', horizon_days: 5, hit_rate: 0.4, judged: 49, avg_excess: null })
    expect(s[2]).toMatchObject({ lit: false, label: 'nothing settled' })
  })
})
