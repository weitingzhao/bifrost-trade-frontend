import { describe, expect, it } from 'vitest'
import { loopReading } from './bookLoopModel'

describe('the loop instrument (Rev .100)', () => {
  it('counts what the stores hold, and leaves the unbuilt arcs to their reasons', () => {
    const r = loopReading({
      hypotheses: [{ status: 'active' }, { status: 'active' }, { status: 'validated' }],
      objectives: [
        { status: 'active', track_record: { judged: 10, hit_rate: 0.4 } as never },
        { status: 'paused', track_record: { judged: 5, hit_rate: 0.2 } as never },
      ],
      runs: [{ started_at: '2026-11-02T13:00:00Z' }, { started_at: '2026-11-01T13:00:00Z' }],
      todayTraces: 7,
      memory: { memories: [{} as never, {} as never], week: { range: '', moved: 1, forgot: 0 } },
      today: '2026-11-02',
    })
    expect(r).toMatchObject({ beliefs: 2, running: 1, runsToday: 1, settled: '15 · 5 right', traces: 7, memory: '2 · 1 this week' })
    expect(r.owed.borrow).toMatch(/Draft objective/)
  })

  it('a store that has not answered reads as unknown, not zero', () => {
    const r = loopReading({ hypotheses: null, objectives: null, runs: null, todayTraces: null, memory: null, today: '2026-11-02' })
    expect([r.beliefs, r.running, r.runsToday, r.settled, r.memory]).toEqual([null, null, null, null, null])
  })
})
