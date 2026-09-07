import { describe, expect, it } from 'vitest'
import type { AiDraft } from '@/api/researchDrafts'
import { digestBatches, digestDissents, digestFirst, digestResolutions, isDailyDigest } from './dailyDigest'

const draft = (kind: string, created_at: string) => ({ kind, created_at }) as Pick<AiDraft, 'kind' | 'created_at'>

describe('daily digest (D2)', () => {
  it('puts the digest first, newest digest first, and keeps the rest in order', () => {
    const rows = [draft('candidate_batch', '2026-09-07T13:30'), draft('daily_digest', '2026-09-06T11:30'), draft('policy_suggestion', '2026-09-07T13:31'), draft('daily_digest', '2026-09-07T11:30')]
    expect(digestFirst(rows).map((r) => `${r.kind}@${r.created_at.slice(5, 10)}`)).toEqual([
      'daily_digest@09-07',
      'daily_digest@09-06',
      'candidate_batch@09-07',
      'policy_suggestion@09-07',
    ])
    expect(isDailyDigest(draft('daily_digest', ''))).toBe(true)
    expect(isDailyDigest(draft('morning_brief', ''))).toBe(false)
  })

  it('reads the folded batches, dissents and resolutions from the payload', () => {
    const payload = {
      batches: [
        { run_id: 'run_1', run_ids: ['run_1', 'run_0'], repeats: 2, objective_id: 'obj', objective_title: 'Daily Loop Stock Explorer', status: 'awaiting_approval', candidates: ['WT', 'LPG'], dissent: 1, draft_ids: ['d1'] },
        { objective_id: 'no-run-id' },
      ],
      dissents: [{ symbol: 'WT', run_id: 'run_1', objective_title: 'Daily Loop Stock Explorer', net_stance: 'dissent', blocked_by_validate: false, judges: ['deepseek-chat/analyze: support'], wrong_if: ['close below the 50-day'] }],
      resolutions: [{ id: 'hyp_lpg', title: 'LPG breakout', status: 'validated', symbols: ['LPG'], excess: 0.0343, by_rule: true }],
    }
    const batches = digestBatches(payload)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toMatchObject({ run_id: 'run_1', repeats: 2, candidates: ['WT', 'LPG'], dissent: 1 })
    expect(digestDissents(payload)[0]).toMatchObject({ symbol: 'WT', judges: ['deepseek-chat/analyze: support'] })
    expect(digestResolutions(payload)[0]).toMatchObject({ title: 'LPG breakout', status: 'validated', excess: 0.0343, by_rule: true })
    expect(digestBatches({})).toEqual([])
  })
})
