/**
 * The Method face's arithmetic for Today's candidates (design
 * `Research Stock Ratings Method.dc.html`, route rev 2026-09-22.6): what state
 * the night batch is in, what the funnel held at each step, and what each
 * candidate carries as evidence.
 *
 * Everything is a mapping over stores that answered on DEV before this was
 * built; a tile whose store does not exist renders the design's own `—` with
 * the reason in its source line, never a guess.
 */
import type { SepaScoreRow } from '@/api/researchEngine'
import type { OrchestrationStatus } from '@/api/research/orchestration'
import type { CandidateOutcomeSummary } from '@/api/research/candidateOutcome'
import type { UniverseReach } from '@/api/research/universeReach'

export type BatchState = 'loading' | 'live' | 'empty' | 'failed'

/**
 * The batch's own standing, judged from the orchestrator: a failed or overdue
 * `research_trading_day` holds yesterday's queue; a clean run with zero
 * candidates is a result, not a blank.
 */
export function batchState(
  orch: OrchestrationStatus | undefined,
  queueLoaded: boolean,
  queueCount: number
): BatchState {
  if (!queueLoaded) return 'loading'
  const sched = orch?.schedules.find((s) => s.job_name === 'research_trading_day')
  const failed =
    orch?.overdue === true ||
    (orch?.verdict != null && orch.verdict !== 'healthy') ||
    sched?.last_run_status === 'FAILURE'
  if (failed) return 'failed'
  return queueCount === 0 ? 'empty' : 'live'
}

/** `STAGE_2A` → `2A` — the design prints the stage bare. */
export function stageLabel(stage: string): string {
  return stage.replace(/^STAGE_/, '')
}

export interface CandidateChip {
  label: string
  variant: 'info' | 'neutral' | 'warning'
}

export interface CandidateTile {
  label: string
  value: string
  src: string
  /** Grey when the store behind it does not measure this name — or exist. */
  measured: boolean
}

export interface CandidateCard {
  rank: number
  symbol: string
  score: number
  grade: string
  momScore: number
  sepaLine: string
  chips: CandidateChip[]
  tiles: CandidateTile[]
}

const fmt0 = (v: number | null | undefined) => (v == null ? '—' : String(Math.round(v)))

export function candidateCard(row: SepaScoreRow, rank: number): CandidateCard {
  const stage = stageLabel(row.stage)
  return {
    rank,
    symbol: row.symbol,
    score: Math.round(row.sepa_score),
    grade: row.grade,
    momScore: Math.round(row.momentum_score),
    sepaLine: `STAGE ${stage} · ${row.path} · MOM ${Math.round(row.momentum_score)}`,
    chips: [
      { label: `SEPA STAGE ${stage} · ${row.path}`, variant: 'info' },
      { label: `GRADE ${row.grade}`, variant: 'info' },
      {
        label: `TECH ${row.tech_pass_count}/11 · FUND ${row.fund_pass_count}/8`,
        variant: 'neutral',
      },
    ],
    tiles: [
      {
        label: 'Forecast',
        value: '—',
        src: 'no forecast store — LLM prior not on the plan',
        measured: false,
      },
      {
        label: 'Same-setup hit',
        value: '—',
        src: 'no per-setup backtest store — source-level record is in the funnel',
        measured: false,
      },
      {
        label: 'IV percentile',
        value: fmt0(row.iv_percentile),
        src:
          row.iv_percentile == null
            ? 'not measured — edge tier, chain not collected'
            : 'features · 1y window',
        measured: row.iv_percentile != null,
      },
      {
        // The hero swaps this placeholder for the live exhibit reading.
        label: 'GEX flip',
        value: '—',
        src: 'gex_regime exhibit · hero only',
        measured: false,
      },
      {
        label: 'PCR (OI)',
        value: row.pcr_oi == null ? '—' : row.pcr_oi.toFixed(2),
        src:
          row.pcr_oi == null
            ? 'chain not collected'
            : 'max pain not computed — PCR is what the store holds',
        measured: row.pcr_oi != null,
      },
    ],
  }
}

export interface FunnelTile {
  label: string
  value: string
  src: string
  warn: boolean
}

/**
 * The funnel, each step from the store that owns it. The last step is the
 * pool-level outcome record — the store settles 1d and 5d horizons, and the
 * tile says those words rather than borrowing the design's 20d.
 */
export function funnelTiles(
  reach: UniverseReach | undefined,
  dailyCount: number | null,
  dailyCapped: boolean,
  queueCount: number | null,
  outcome: CandidateOutcomeSummary | undefined
): FunnelTile[] {
  const scan = reach?.layers.find((l) => l.key === 'scan')
  const h1 = outcome?.horizons.find((h) => h.horizon_days === 1)
  const h5 = outcome?.horizons.find((h) => h.horizon_days === 5)
  const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`)
  return [
    {
      label: 'Universe',
      value: scan ? String(scan.symbols) : '—',
      src: 'universe/reach · scan layer',
      warn: false,
    },
    {
      label: 'Path ≥ SETUP',
      value: dailyCount == null ? '—' : `${dailyCount}${dailyCapped ? '+' : ''}`,
      src: 'stock_signal_sepa_daily',
      warn: false,
    },
    {
      label: 'Candidate queue',
      value: queueCount == null ? '—' : String(queueCount),
      src: 'sepa/model/candidates',
      warn: false,
    },
    {
      label: 'Source hit-rate · 90d',
      value: h1 || h5 ? `${pct(h1?.hit_rate)} @1d · ${pct(h5?.hit_rate)} @5d` : '—',
      src: outcome ? `candidate-outcome · ${outcome.candidates} candidates` : 'candidate-outcome',
      warn: (h5?.hit_rate ?? 1) < 0.45,
    },
  ]
}
