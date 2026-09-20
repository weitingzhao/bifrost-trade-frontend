import { describe, expect, it } from 'vitest'
import {
  candidateObjectiveId,
  draftObjectiveId,
  hypothesisRunId,
  objectiveLap,
  type LapInput,
} from './objectiveLapModel'

const OBJ = 'obj-daily-loop-stock'

/** The shapes DEV actually returns, trimmed to the fields the lap reads. */
const base: LapInput = {
  objectiveId: OBJ,
  brief: {
    id: OBJ,
    title: 'Daily Loop Stock Explorer',
    status: 'active',
    schedule: 'daily_open',
    hunts: '',
    last_run: null,
    last_memo: { considered: 3446 },
    track_record: { status: 'ok', horizon_days: 5, hit_rate: 0.3, judged: 40, pending: 1 },
    spend_30d_usd: 0,
    pending_memos: 8,
    runs: 25,
  } as unknown as LapInput['brief'],
  candidates: [],
  runIds: new Set<string>(),
  hypotheses: [],
  drafts: [],
}

const lap = (over: Partial<LapInput> = {}) => {
  const rows = objectiveLap({ ...base, ...over })
  return Object.fromEntries(rows.map((s) => [s.id, s]))
}

describe('objectiveLap', () => {
  it('counts only this objective’s stock at each station', () => {
    const s = lap({
      candidates: [
        { status: 'open', source_ref: { objective_id: OBJ } },
        { status: 'open', source_ref: { objective_id: 'obj-other' } },
        // Promoted is no longer in the pool — the station is what it holds.
        { status: 'promoted', source_ref: { objective_id: OBJ } },
      ] as unknown as LapInput['candidates'],
      runIds: new Set(['run-a']),
      hypotheses: [
        { origin_ref: { run_id: 'run-a' } },
        { origin_ref: { run_id: 'run-elsewhere' } },
        { origin_ref: { source: 'copilot_write' } },
      ] as unknown as LapInput['hypotheses'],
      drafts: [
        { kind: 'policy_suggestion', payload: { objective_id: OBJ } },
        { kind: 'policy_suggestion', payload: { objective_id: 'obj-other' } },
        // A candidate batch is a judge-station item, not a patch.
        { kind: 'candidate_batch', payload: { objective_id: OBJ } },
      ] as unknown as LapInput['drafts'],
    })
    expect(s.nominate.value).toBe(1)
    expect(s.decide.value).toBe(1)
    expect(s.feedback.value).toBe(1)
  })

  it('reads the standing for the stations the server already counts', () => {
    const s = lap()
    expect(s.scan.value).toBe(3446)
    expect(s.judge.value).toBe(8)
    expect(s.settle.value).toBe(40)
    expect(s.settle.detail).toContain('hit 30%')
    expect(s.settle.detail).toContain('1 open')
  })

  it('marks the two stations that leave the research loop', () => {
    const s = lap()
    expect(s.settle.crossesOuterLoop).toBe(true)
    expect(s.feedback.crossesOuterLoop).toBe(true)
    expect(s.scan.crossesOuterLoop).toBeUndefined()
  })

  it('keeps every station when the machine has never run', () => {
    // A draft objective's four empty stations ARE its status. Six rows, always
    // — the row that disappears when it reads zero is the one that would have
    // told you something.
    const rows = objectiveLap({ ...base, brief: null })
    expect(rows).toHaveLength(6)
    expect(rows.map((r) => r.value)).toEqual([null, 0, null, 0, null, 0])
    expect(rows[0].detail).toBe('no run yet')
    expect(rows[4].detail).toBe('nothing settled')
  })
})

describe('the joins each station uses', () => {
  it('reads an objective off a candidate’s source_ref, and nothing else', () => {
    expect(candidateObjectiveId({ source_ref: { objective_id: OBJ } })).toBe(OBJ)
    expect(candidateObjectiveId({ source_ref: { run_id: 'r' } })).toBeNull()
    expect(candidateObjectiveId({ source_ref: null })).toBeNull()
  })

  it('traces a hypothesis by its birth run, which is how the loop stamps one', () => {
    expect(hypothesisRunId({ origin_ref: { run_id: 'run-a' } })).toBe('run-a')
    // A Copilot-written hypothesis has no run and belongs to no objective.
    expect(hypothesisRunId({ origin_ref: { source: 'copilot_write' } })).toBeNull()
  })

  it('reads a draft’s objective off the payload', () => {
    expect(draftObjectiveId({ payload: { objective_id: OBJ } })).toBe(OBJ)
    expect(draftObjectiveId({ payload: {} })).toBeNull()
  })
})
