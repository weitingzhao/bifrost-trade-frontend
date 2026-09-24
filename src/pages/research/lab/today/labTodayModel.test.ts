import { describe, expect, it } from 'vitest'
import type { SepaScoreRow } from '@/api/researchEngine'
import { batchState, candidateCard, funnelTiles, stageLabel } from './labTodayModel'

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
    expect(iv.src).toContain('chain not collected')
    // The stores that do not exist say so instead of pretending to be zero.
    expect(c.tiles.find((t) => t.label === 'Forecast')!.src).toContain('not on the plan')
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
