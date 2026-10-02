import { describe, expect, it } from 'vitest'
import type { SepaScoreRow } from '@/api/researchEngine'
import {
  batchState,
  candidateCard,
  forecastCall,
  forecastTile,
  funnelTiles,
  ivTile,
  IV_UNRANKED,
  labWatchlistItem,
  loopBriefFor,
  pinTile,
  sameSetupTile,
  stageLabel,
} from './labTodayModel'

// Invented rows throughout.
const row = (over: Partial<SepaScoreRow> = {}): SepaScoreRow =>
  ({
    symbol: 'TEST',
    trade_date: '2026-09-24',
    fundamental_score: 75,
    trend_template_score: 100,
    momentum_score: 70.2,
    structure_score: 78,
    sepa_score: 83.4,
    grade: 'A',
    stage: 'STAGE_2A',
    path: 'PIVOT',
    trend_template_pass: true,
    fundamental_pass: true,
    latest_close: 100,
    sma_50: null,
    sma_150: null,
    sma_200: null,
    high_52w: null,
    low_52w: null,
    iv_percentile: 42,
    pcr_oi: 0.82,
    fund_pass_count: 7,
    tech_pass_count: 10,
    factors_json: {},
    computed_at: '2026-09-24T02:00:00Z',
    ...over,
  }) as SepaScoreRow

const orch = (over: Record<string, unknown> = {}) =>
  ({
    verdict: 'healthy',
    schedules: [
      {
        name: 's',
        job_name: 'research_trading_day',
        status: 'RUNNING',
        last_run_status: 'SUCCESS',
        last_run_ended_at: '2026-09-24T02:43:04Z',
        last_run_id: 'x',
      },
    ],
    ...over,
  }) as never

describe('the batch state', () => {
  it('is one of the design’s four, judged from the orchestrator', () => {
    expect(batchState(undefined, false, 0)).toBe('loading')
    expect(batchState(orch(), true, 8)).toBe('live')
    expect(batchState(orch(), true, 0)).toBe('empty')
    expect(batchState(orch({ verdict: 'degraded' }), true, 8)).toBe('failed')
    expect(batchState(orch({ overdue: true }), true, 8)).toBe('failed')
  })

  it('reads a failed run as failed even when yesterday’s queue still answers', () => {
    const o = orch()
    ;(o as { schedules: { last_run_status: string }[] }).schedules[0].last_run_status = 'FAILURE'
    expect(batchState(o, true, 8)).toBe('failed')
  })
})

describe('a candidate’s card', () => {
  it('prints the stage bare and carries the pass counts as the design chips them', () => {
    expect(stageLabel('STAGE_2A')).toBe('2A')
    const c = candidateCard(row(), 1)
    expect(c.score).toBe(83)
    expect(c.chips.map((x) => x.label)).toEqual([
      'SEPA STAGE 2A · PIVOT',
      'GRADE A',
      'TECH 10/11 · FUND 7/8',
    ])
    expect(c.sepaLine).toBe('STAGE 2A · PIVOT · MOM 70')
  })

  it('answers a missing measurement with the design’s own dash and the reason', () => {
    const c = candidateCard(row({ iv_percentile: null, pcr_oi: null }), 2)
    const iv = c.tiles.find((t) => t.label === 'IV percentile')!
    expect(iv.value).toBe('—')
    expect(iv.measured).toBe(false)
    expect(c.chips.map((x) => x.label)).toContain(IV_UNRANKED)
    // A tile read per hero says so until the reading lands — never a zero.
    const fc = c.tiles.find((t) => t.label === 'Forecast')!
    expect(fc.value).toBe('—')
    expect(fc.src).toContain('read for the hero')
    expect(c.tiles.find((t) => t.label === 'Max pain · PCR')!.src).toBe('chain not collected')
  })

  it('wears the state inks, not the contract sky', () => {
    const c = candidateCard(row({ grade: 'D' }), 3, { rs: 88 })
    expect(c.chips.map((x) => x.variant)).toEqual(['state-blue', 'warning', 'neutral', 'neutral'])
  })
})

describe('the hero’s evidence', () => {
  const session = {
    session_id: 's',
    symbol: 'TEST',
    trade_date: '2026-09-25',
    regime: 'trending',
    spot: 100,
    prob_rangy: 0.2,
    prob_bull: 0.55,
    prob_bear: 0.1,
    prob_squeeze: 0.15,
    expected_close: 101,
    structures_json: [],
    narrative: '',
    llm_provider: 'heuristic',
    advisory: '',
    computed_at: '2026-09-26T03:00:00Z',
  }

  it('reads the forecast’s own call and its provider', () => {
    const call = forecastCall(session)!
    expect(call.path).toBe('bull')
    const t = forecastTile(call, { loading: false, error: false })
    expect(t.value).toBe('55%')
    expect(t.src).toBe('bull · heuristic · session 09-25')
    expect(forecastTile(null, { loading: false, error: true }).src).toBe('forecast session unread')
  })

  it('matches the setup to the forecast’s scenario and ambers a thin record', () => {
    const hr = {
      symbol: 'TEST',
      window_days: 90,
      horizon: 5,
      trigger_count: 20,
      evaluated_count: 14,
      hit_count: 9,
      hit_rate: 0.64,
      by_scenario: { bull: { n: 6, hits: 5, rate: 0.8333 }, rangy: { n: 8, hits: 4, rate: 0.5 } },
      rows: [],
    }
    const t = sameSetupTile(hr, 'bull', { loading: false, error: false })
    expect(t.value).toBe('83%')
    expect(t.src).toBe('playbook · bull · 6 triggers · 5d')
    expect(t.warn).toBe(true)
    expect(sameSetupTile(hr, 'bear', { loading: false, error: false }).src).toBe('no bear trigger settled in 90d')
  })

  it('puts max pain beside the PCR once the pin lens answers', () => {
    const t = pinTile({ max_pain_strike: 45, expiry: '2026-10-16', pin_pct_distance: 0.047 }, 0.76, {
      loading: false,
      error: false,
    })
    expect(t.value).toBe('45 · 0.76')
    expect(t.src).toBe('opex_pin · 10-16 expiry · 4.7% from close')
  })

  it('says why an IV is unranked: no row, or too little history', () => {
    const read = { loading: false, error: false }
    expect(ivTile(null, null, read).src).toBe('no IV row — chain not collected')
    const short = { symbol: 'TEST', trade_date: '2026-09-25', iv_current: 0.39, iv_percentile_1y: null, iv_rank_1y: null, lookback_days: 11 }
    expect(ivTile(null, short, read).src).toBe('IV 39 now · 11d of history — too short to rank')
    expect(ivTile(42.4, short, read).value).toBe('42')
  })

  it('finds the newest batch that carries the name, and reads its verdict', () => {
    const drafts = [
      {
        kind: 'candidate_batch',
        created_at: '2026-09-24T13:00:00Z',
        payload: { candidates: [{ symbol: 'TEST', net_stance: 'support', agent_verdicts: { verdict: { summary: 'old' } } }] },
      },
      {
        kind: 'candidate_batch',
        created_at: '2026-09-25T13:00:00Z',
        payload: {
          run_id: 'run_x',
          persona_eval: { models: [{ model: 'model-a' }, { model: 'model-b' }] },
          candidates: [
            {
              symbol: 'TEST',
              net_stance: 'dissent',
              blocked_by_validate: true,
              agent_verdicts: { verdict: { summary: 'newer' } },
              wrong_if: ['score falls below 70'],
            },
          ],
        },
      },
    ]
    const b = loopBriefFor(drafts, 'test')!
    expect(b.day).toBe('2026-09-25')
    expect(b.verdict).toBe('newer')
    expect(b.stance).toBe('dissent')
    expect(b.blocked).toBe(true)
    expect(b.models).toEqual(['model-a', 'model-b'])
    expect(loopBriefFor(drafts, 'OTHER')).toBeNull()
  })
})

describe('the funnel', () => {
  it('reads each step from the store that owns it, in the store’s own words', () => {
    const tiles = funnelTiles(
      {
        layers: [{ key: 'scan', label: 'Scan', table: 't', note: '', symbols: 663, status: 'ok' }],
        widest_symbols: null,
        loop_symbols: null,
        loop_pct_of_widest: null,
        measured: true,
      } as never,
      200,
      true,
      30,
      {
        source: null,
        days: 90,
        candidates: 71,
        pending: 3,
        horizons: [
          {
            horizon_days: 1,
            settled: 68,
            judged: 68,
            hits: 33,
            hit_rate: 0.485,
            avg_return: 0,
            avg_benchmark: 0,
            avg_excess: 0,
          },
          {
            horizon_days: 5,
            settled: 59,
            judged: 59,
            hits: 20,
            hit_rate: 0.339,
            avg_return: 0,
            avg_benchmark: 0,
            avg_excess: 0,
          },
        ],
      } as never
    )
    expect(tiles.map((t) => t.value)).toEqual(['663', '200+', '30', '49% @1d · 34% @5d'])
    // The leash ambering is the record being under the line, not a fault.
    expect(tiles[3].warn).toBe(true)
    expect(tiles[3].src).toContain('71 candidates')
  })
})

describe('labWatchlistItem (the queue\'s Watch button)', () => {
  it('posts the canonical stock key, not STK:SYM', () => {
    expect(labWatchlistItem('zzq')).toEqual({
      contract_key: 'ZZQ|STK|||',
      symbol: 'ZZQ',
      sec_type: 'STK',
      source: 'lab-today',
    })
  })
})
