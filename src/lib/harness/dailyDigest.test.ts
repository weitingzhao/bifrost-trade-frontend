import { describe, expect, it } from 'vitest'
import type { AiDraft } from '@/api/researchDrafts'
import { digestBatches, digestDissents, digestExhibits, digestFirst, digestLamps, digestLenses, digestResolutions, isDailyDigest } from './dailyDigest'

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

  it('reads the exhibits behind the digest, one row per name on its list', () => {
    const payload = {
      symbols: ['FN', 'NVDA', 'SGOV'],
      exhibits: {
        NVDA: [
          { lens: 'iv_rank', band: 'lean_cold', means: 'premium is cheap', as_of: '2026-09-10', freshness: 'fresh' },
          { lens: 'gex_regime', band: null, means: '', as_of: null, freshness: 'missing' },
        ],
        FN: [{ lens: 'vrp', band: 'hot', freshness: 'fresh' }, { band: 'hot' }],
        SPY: [{ lens: 'iv_rank', band: 'neutral', freshness: 'fresh' }],
      },
    }
    const rows = digestExhibits(payload)
    // SGOV is on the list with nothing read: it keeps a row. SPY was read but not listed: it comes last.
    expect(rows.map((r) => [r.symbol, r.readings.length])).toEqual([['FN', 1], ['NVDA', 2], ['SGOV', 0], ['SPY', 1]])
    expect(rows[1].readings[1]).toEqual({ lens: 'gex_regime', freshness: 'missing', band: null, means: null, as_of: null })
    expect(digestLenses(rows)).toEqual(['vrp', 'iv_rank', 'gex_regime'])
    expect(digestExhibits({ exhibits: [] })).toEqual([])
  })

  it('lights its four lamps from what the digest recorded', () => {
    const payload = {
      holdings_status: 'applied',
      symbols: ['FN', 'NVDA'],
      exhibits: {
        FN: [{ lens: 'iv_rank', freshness: 'fresh' }, { lens: 'vrp', freshness: 'missing' }],
        NVDA: [{ lens: 'iv_rank', freshness: 'fresh' }, { lens: 'vrp', freshness: 'fresh' }],
      },
      // 2026-09-09 on DEV: the digest recorded one run, awaiting approval.
      loop: { runs: [{ id: 'run_1', objective_id: 'obj', status: 'awaiting_approval' }] },
    }
    // Missing is counted in the label, not coloured: 3 of 4 present, all fresh, so green.
    expect(digestLamps(payload).map((l) => [l.label, l.lamp])).toEqual([
      ['book', 'green'],
      ['lenses 3/4', 'green'],
      ['loop', 'yellow'],
      ['events', 'gray'],
    ])
  })

  it('goes amber on a stale reading, and grey where it cannot say', () => {
    const stale = digestLamps({
      holdings_status: 'unavailable',
      symbols: ['FN'],
      exhibits: { FN: [{ lens: 'iv_rank', freshness: 'stale' }] },
      loop: { runs: [] },
    })
    expect(stale.map((l) => [l.label, l.lamp])).toEqual([
      ['book', 'gray'],
      ['lenses 1/1', 'yellow'],
      ['loop', 'gray'],
      ['events', 'gray'],
    ])
    expect(digestLamps({ symbols: ['FN'], exhibits: { FN: [{ lens: 'vrp', freshness: 'missing' }] } })[1]).toMatchObject({
      label: 'lenses 0/1',
      lamp: 'gray',
    })
  })
})
