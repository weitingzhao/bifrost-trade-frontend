import { describe, expect, it } from 'vitest'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { ObjectiveRun } from '@/api/research/harness'
import {
  candidateObjectiveId,
  draftObjectiveId,
  hypothesisRunId,
  objectiveLap,
  candidateOwnTags,
  candidateRunId,
  candidateSketch,
  curatorRunReading,
  scoreShare,
  splitByObjective,
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

describe('splitByObjective', () => {
  const c = (objectiveId: string | null): ResearchCandidate =>
    ({
      id: `c-${objectiveId ?? 'none'}-${Math.random()}`,
      source_ref: objectiveId ? { objective_id: objectiveId } : null,
    }) as unknown as ResearchCandidate

  it('keeps this objective’s rows and counts the two kinds it hid', () => {
    // Both hidden kinds are part of the answer to "what did THIS one
    // produce", and they are different answers: another machine proposed
    // some, and nobody's machine proposed the rest.
    const out = splitByObjective([c('a'), c('a'), c('b'), c(null)], 'a')
    expect(out.kept).toHaveLength(2)
    expect(out).toMatchObject({ otherObjective: 1, noObjective: 1, total: 4 })
  })

  it('treats a source_ref without an objective as no objective, not another one', () => {
    const out = splitByObjective(
      [{ source_ref: { symbol: 'NVDA' } } as unknown as ResearchCandidate],
      'a',
    )
    expect(out).toMatchObject({ otherObjective: 0, noObjective: 1, total: 1 })
  })

  it('answers an empty list without pretending anything was hidden', () => {
    expect(splitByObjective([], 'a')).toEqual({
      kept: [],
      otherObjective: 0,
      noObjective: 0,
      total: 0,
    })
  })
})

describe('candidateSketch', () => {
  const snap = (lens_snapshot: Record<string, unknown> | null): ResearchCandidate =>
    ({ lens_snapshot }) as unknown as ResearchCandidate

  it('writes out the lenses that fired, in the order a reader scans them', () => {
    expect(
      candidateSketch(
        snap({
          path: 'EXT',
          stage: 'STAGE_2A',
          grade: 'A',
          sepa_score: 71.75,
          momentum_score: 84.0311,
        }),
      ),
    ).toEqual(['EXT · stage 2A', 'grade A', 'SEPA 71.8', 'momentum 84.0'])
  })

  it('prints only what is there, never a placeholder for what is not', () => {
    // A name a screen nominated carries no run snapshot, and the column says
    // nothing rather than inventing the sentence nobody wrote.
    expect(candidateSketch(snap(null))).toEqual([])
    expect(candidateSketch(snap({ grade: 'B' }))).toEqual(['grade B'])
  })

  it('ignores a lens whose value is not a number where a number is meant', () => {
    expect(candidateSketch(snap({ sepa_score: 'high', grade: 'A' }))).toEqual(['grade A'])
  })
})

describe('scoreShare', () => {
  it('measures against the best in view, because the composite has no ceiling', () => {
    expect(scoreShare(40, 80)).toBe(0.5)
    expect(scoreShare(80, 80)).toBe(1)
  })

  it('has no share to give when either half is missing', () => {
    expect(scoreShare(null, 80)).toBeNull()
    expect(scoreShare(40, null)).toBeNull()
    expect(scoreShare(40, 0)).toBeNull()
  })
})

describe('curatorRunReading', () => {
  const run = (startedAt: string, ids: string[], ): ObjectiveRun =>
    ({ id: `r-${startedAt}`, objective_id: 'o', started_at: startedAt, outputs: { candidate_ids: ids } }) as unknown as ObjectiveRun
  const cand = (status: string) => ({ status }) as Pick<ResearchCandidate, 'status'>

  it('reads the newest run, not the first in the list', () => {
    const out = curatorRunReading(
      [run('2026-09-10T00:00:00Z', ['a']), run('2026-09-18T13:30:00Z', ['b', 'c']), run('2026-09-12T00:00:00Z', [])],
      [],
      () => 0.0125,
    )
    expect(out).toMatchObject({ startedAt: '2026-09-18T13:30:00Z', proposed: 2, usd: 0.0125 })
  })

  it('counts what expiry screened out of the pool, which is a different question', () => {
    const out = curatorRunReading([run('2026-09-18T00:00:00Z', [])], [cand('expired'), cand('open'), cand('expired')], () => 0)
    expect(out?.expired).toBe(2)
    // A run that proposed nothing still ran, and the cell must say so rather
    // than falling back to the rows' newest date.
    expect(out?.proposed).toBe(0)
  })

  it('has nothing to report when no run was recorded', () => {
    expect(curatorRunReading([], [cand('open')], () => 0)).toBeNull()
  })
})

describe('candidateRunId', () => {
  it('finds the run that proposed a name, and none where none did', () => {
    expect(candidateRunId({ source_ref: { run_id: 'run_1' } } as never)).toBe('run_1')
    expect(candidateRunId({ source_ref: { objective_id: 'o' } } as never)).toBeNull()
    expect(candidateRunId({ source_ref: null } as never)).toBeNull()
  })
})


describe('candidateOwnTags', () => {
  const row = (over: Record<string, unknown> = {}) =>
    ({ tags: [], source: 'harness', lens_snapshot: {}, ...over }) as never

  it('drops a tag the row already says in Source', () => {
    expect(candidateOwnTags(row({ tags: ['harness', 'iv-hot'] }))).toEqual(['iv-hot'])
  })

  it('drops a tag the Why cell already prints as data_source', () => {
    expect(
      candidateOwnTags(
        row({ tags: ['stock_composite', 'pivot'], lens_snapshot: { data_source: 'stock_composite' } }),
      ),
    ).toEqual(['pivot'])
  })

  it('matches without caring about case', () => {
    expect(candidateOwnTags(row({ tags: ['HARNESS'] }))).toEqual([])
  })

  it('keeps everything on a row that repeats nothing', () => {
    expect(candidateOwnTags(row({ tags: ['iv-hot', 'pivot'] }))).toEqual(['iv-hot', 'pivot'])
  })

  it('answers empty for an untagged row rather than throwing', () => {
    expect(candidateOwnTags(row({ tags: undefined }))).toEqual([])
  })
})
