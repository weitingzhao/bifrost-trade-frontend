/**
 * The Method face's arithmetic for Today's candidates (design
 * `Research Stock Ratings Method.dc.html`, route rev 2026-09-22.6): what state
 * the night batch is in, what the funnel held at each step, and what each
 * candidate carries as evidence.
 *
 * Everything is a mapping over stores that answered on DEV before this was
 * built; a tile whose store does not answer for a name renders the design's
 * own `—` with the reason in its source line, never a guess.
 *
 * Measured 2026-09-26 (§15.6): the three evidence stores the first build
 * called missing all answer per name — the forecast session
 * (`/research/forecast/sessions`), the playbook trigger record by scenario
 * (`/research/playbook/hit-rate`) and max pain on the opex expiry (the
 * `opex_pin` exhibit) — and the loop's candidate batches carry a written
 * verdict per candidate (`ai_draft` kind `candidate_batch`). The hero reads
 * all four; the tiles below are their shapes.
 */
import type { ForecastSession, PlaybookHitRateSummary, SepaScoreRow } from '@/api/researchEngine'
import type { OrchestrationStatus } from '@/api/research/orchestration'
import type { CandidateOutcomeSummary } from '@/api/research/candidateOutcome'
import type { UniverseReach } from '@/api/research/universeReach'
import type { IvPercentileRow } from '@/types/ivRadar'
import { stockWatchlistContractKey } from '@/components/research/watchlistContractKey'

export type BatchState = 'loading' | 'live' | 'empty' | 'failed'

/** The chip a queue row wears when its IV percentile is missing. */
export const IV_UNRANKED = 'IV UNRANKED'

/** Sessions a 1y percentile needs before the store will rank today's IV. */
const RANK_WINDOW = 252

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
  /** Stages are the state blue, a good grade the state green (§14.7) — not the contract sky. */
  variant: 'state-blue' | 'state-green' | 'neutral' | 'warning'
}

export interface CandidateTile {
  label: string
  value: string
  src: string
  /** Grey when the store behind it does not measure this name. */
  measured: boolean
  /** Amber: measured, but thin or under the line a reader should trust. */
  warn?: boolean
  /** The reading's own caveat, on hover. */
  title?: string
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
  company: string | null
  /** 20-session momentum as a fraction; null until the bars arrive. */
  mom20: number | null
  hit: { hits: number; n: number } | null
}

const fmt0 = (v: number | null | undefined) => (v == null ? '—' : String(Math.round(v)))

export interface CandidateExtras {
  /** From the SEPA wide table, joined by symbol. */
  company?: string | null
  rs?: number | null
  /** 20-session momentum, a fraction, from the store's own closes. */
  mom20?: number | null
  /** Settled candidate outcomes for this name: hits over judged. */
  hit?: { hits: number; n: number } | null
}

/** A grade is a state: the top two are good, D is under the line, the rest plain. */
export function gradeVariant(grade: string): 'state-green' | 'warning' | 'neutral' {
  return grade === 'A+' || grade === 'A' ? 'state-green' : grade === 'D' ? 'warning' : 'neutral'
}

export function candidateCard(row: SepaScoreRow, rank: number, x: CandidateExtras = {}): CandidateCard {
  const stage = stageLabel(row.stage)
  return {
    rank,
    symbol: row.symbol,
    score: Math.round(row.sepa_score),
    grade: row.grade,
    momScore: Math.round(row.momentum_score),
    company: x.company ?? null,
    mom20: x.mom20 ?? null,
    hit: x.hit ?? null,
    sepaLine: `STAGE ${stage} · ${row.path} · ${x.rs != null ? `RS ${Math.round(x.rs)}` : `MOM ${Math.round(row.momentum_score)}`}`,
    chips: [
      { label: `SEPA STAGE ${stage} · ${row.path}`, variant: 'state-blue' },
      { label: `GRADE ${row.grade}`, variant: gradeVariant(row.grade) },
      ...(x.rs != null ? [{ label: `RS ${Math.round(x.rs)}`, variant: 'neutral' as const }] : []),
      {
        label: `TECH ${row.tech_pass_count}/11 · FUND ${row.fund_pass_count}/8`,
        variant: 'neutral',
      },
      // No committed IV percentile — the design's own HALO row prints the
      // miss instead of hiding it. Measured 2026-09-26: 8 of the queue's 10
      // unranked names have a collected chain and a current IV, with 9–46
      // days of history — too short to rank, not a thin chain. So the chip
      // says what is known (unranked) and the hero's tile says why.
      ...(row.iv_percentile == null ? [{ label: IV_UNRANKED, variant: 'warning' as const }] : []),
    ],
    tiles: [
      // The next four are read for the hero only (one request each per
      // name); these are their shapes before the reading lands.
      {
        label: 'Forecast',
        value: '—',
        src: 'forecast session · read for the hero',
        measured: false,
      },
      {
        label: 'Same-setup hit',
        value: '—',
        src: 'playbook record · read for the hero',
        measured: false,
      },
      {
        label: 'IV percentile',
        value: fmt0(row.iv_percentile),
        src: row.iv_percentile == null ? 'unranked · the reason is read for the hero' : 'features · 1y window',
        measured: row.iv_percentile != null,
      },
      {
        // The hero swaps this placeholder for the live exhibit reading.
        label: 'GEX flip',
        value: '—',
        src: 'gex_regime exhibit · hero only',
        measured: false,
      },
      // Max pain is computed (the opex_pin exhibit); the hero swaps it in
      // beside the PCR the queue row already carries.
      pinTile(undefined, row.pcr_oi),
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

/** 20-session momentum from a closes series (needs 21 bars), as a fraction. */
export function mom20From(bars: readonly { close: number | null }[]): number | null {
  const closes = bars.map((b) => b.close).filter((c): c is number => c != null && c > 0)
  if (closes.length < 21) return null
  const last = closes[closes.length - 1]
  const base = closes[closes.length - 21]
  return base > 0 ? last / base - 1 : null
}

/** Settled outcomes grouped per symbol — the row-level hit record. */
export function perSymbolHits(
  rows: readonly { symbol: string; hit: boolean | null }[],
): Map<string, { hits: number; n: number }> {
  const out = new Map<string, { hits: number; n: number }>()
  for (const r of rows) {
    if (r.hit == null) continue
    const cur = out.get(r.symbol) ?? { hits: 0, n: 0 }
    cur.n += 1
    if (r.hit) cur.hits += 1
    out.set(r.symbol, cur)
  }
  return out
}

/* ── the hero's evidence, read per name ─────────────────────────────────── */

export type ForecastPath = 'bull' | 'bear' | 'rangy' | 'squeeze'

export interface ForecastCall {
  path: ForecastPath
  prob: number
  provider: string
  session: string
  regime: string
}

/** The session's own call: the scenario it put the most probability on. */
export function forecastCall(s: ForecastSession | null | undefined): ForecastCall | null {
  if (!s) return null
  const probs: [ForecastPath, number][] = [
    ['bull', s.prob_bull],
    ['bear', s.prob_bear],
    ['rangy', s.prob_rangy],
    ['squeeze', s.prob_squeeze],
  ]
  const top = probs
    .filter(([, p]) => typeof p === 'number' && Number.isFinite(p))
    .sort((a, b) => b[1] - a[1])[0]
  if (!top) return null
  return {
    path: top[0],
    prob: top[1],
    provider: s.llm_provider || 'unknown',
    session: s.trade_date,
    regime: s.regime,
  }
}

interface ReadState {
  loading: boolean
  error: boolean
}

function unreadSrc(read: ReadState, store: string, none: string): string {
  if (read.error) return `${store} unread`
  if (read.loading) return `reading the ${store}`
  return none
}

export function forecastTile(call: ForecastCall | null, read: ReadState): CandidateTile {
  if (!call) {
    return {
      label: 'Forecast',
      value: '—',
      src: unreadSrc(read, 'forecast session', 'no forecast session for this name'),
      measured: false,
    }
  }
  return {
    label: 'Forecast',
    value: `${Math.round(call.prob * 100)}%`,
    src: `${call.path} · ${call.provider} · session ${call.session.slice(5)}`,
    measured: true,
    title: `The newest forecast session (${call.session}, ${call.regime} regime) puts ${Math.round(call.prob * 100)}% on the ${call.path} path — the most it puts on any. Provider: ${call.provider}.`,
  }
}

/** Under this, a same-setup record is thin — the design's own small-sample line. */
export const SAME_SETUP_MIN_N = 10
/** The leash the funnel's hit-rate step ambers at. */
export const HIT_RATE_LINE = 0.45

/**
 * The name's playbook triggers that fired in the same scenario the forecast
 * calls today, settled at the record's horizon — the nearest store to the
 * design's "same-setup backtest" (a per-setup replay store does not exist;
 * this is the name's own settled trigger record, split by scenario).
 */
export function sameSetupTile(
  hr: PlaybookHitRateSummary | null | undefined,
  path: ForecastPath | null,
  read: ReadState,
): CandidateTile {
  const cell = hr && path ? hr.by_scenario?.[path] : undefined
  if (!hr || !path || !cell || cell.n === 0 || cell.rate == null) {
    return {
      label: 'Same-setup hit',
      value: '—',
      src: hr
        ? path
          ? `no ${path} trigger settled in ${hr.window_days}d`
          : 'no forecast call to match a setup to'
        : unreadSrc(read, 'playbook record', 'no playbook trigger on this name'),
      measured: false,
    }
  }
  return {
    label: 'Same-setup hit',
    value: `${Math.round(cell.rate * 100)}%`,
    src: `playbook · ${path} · ${cell.n} triggers · ${hr.horizon}d`,
    measured: true,
    warn: cell.n < SAME_SETUP_MIN_N || cell.rate < HIT_RATE_LINE,
    title: `${cell.hits} of ${cell.n} ${path} triggers on this name hit at ${hr.horizon} days over ${hr.window_days} days (all scenarios: ${hr.hit_count} of ${hr.evaluated_count}).`,
  }
}

/**
 * Max pain beside the PCR. Max pain comes from the `opex_pin` exhibit (the
 * pin lens's own expiry, the monthly opex); PCR is the queue row's.
 */
export function pinTile(
  readings: Record<string, unknown> | null | undefined,
  pcr: number | null,
  /** Absent while the exhibit has not been asked for (a queue row, not the hero). */
  read?: ReadState,
): CandidateTile {
  const pain = typeof readings?.max_pain_strike === 'number' ? readings.max_pain_strike : null
  const pcrText = pcr == null ? '—' : pcr.toFixed(2)
  if (pain == null) {
    return {
      label: 'Max pain · PCR',
      value: pcr == null ? '—' : `— · ${pcrText}`,
      src:
        read == null
          ? pcr == null
            ? 'chain not collected'
            : 'max pain · read for the hero'
          : unreadSrc(read, 'opex_pin exhibit', 'no max pain for this name'),
      measured: pcr != null,
    }
  }
  const expiry = typeof readings?.expiry === 'string' ? readings.expiry : null
  const dist = typeof readings?.pin_pct_distance === 'number' ? readings.pin_pct_distance : null
  return {
    label: 'Max pain · PCR',
    value: `${Number.isInteger(pain) ? pain : pain.toFixed(1)} · ${pcrText}`,
    src: `opex_pin${expiry ? ` · ${expiry.slice(5)} expiry` : ''}${dist != null ? ` · ${(dist * 100).toFixed(1)}% from close` : ''}`,
    measured: true,
  }
}

/** What the loop's personas wrote about one candidate, in its newest batch. */
export interface LoopBrief {
  day: string
  runId: string | null
  /** The personas' net stance: support · caution · dissent. */
  stance: string | null
  blocked: boolean
  /** The verdict persona's own sentence. */
  verdict: string | null
  wrongIf: string[]
  models: string[]
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

/**
 * The newest `candidate_batch` draft that carries this symbol, read
 * defensively — the payload is the harness's report and has no schema here.
 */
export function loopBriefFor(
  drafts: readonly { kind: string; created_at: string; payload: Record<string, unknown> }[],
  symbol: string,
): LoopBrief | null {
  const sym = symbol.trim().toUpperCase()
  const batches = drafts
    .filter((d) => d.kind === 'candidate_batch')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  for (const d of batches) {
    const list = Array.isArray(d.payload.candidates) ? d.payload.candidates : []
    const hit = list.map(asRecord).find((c) => asString(c?.symbol)?.toUpperCase() === sym)
    if (!hit) continue
    const verdicts = asRecord(hit.agent_verdicts)
    const verdict = asRecord(verdicts?.verdict)
    const wrong = Array.isArray(hit.wrong_if) ? hit.wrong_if : Array.isArray(hit.falsify) ? hit.falsify : []
    const persona = asRecord(d.payload.persona_eval)
    const models = (Array.isArray(persona?.models) ? persona.models : [])
      .map((m) => asString(asRecord(m)?.model))
      .filter((m): m is string => m != null)
    return {
      day: d.created_at.slice(0, 10),
      runId: asString(d.payload.run_id),
      stance: asString(hit.net_stance),
      blocked: hit.blocked_by_validate === true,
      verdict: asString(verdict?.summary),
      wrongIf: wrong.map(asString).filter((w): w is string => w != null),
      models,
    }
  }
  return null
}

/**
 * Why a queue row has no IV percentile, from the IV store itself: no row at
 * all (no chain collected), or a current IV with too little history to rank.
 * A ranked row keeps the queue's own committed number.
 */
export function ivTile(
  committed: number | null,
  store: IvPercentileRow | null | undefined,
  read: ReadState,
): CandidateTile {
  if (committed != null) {
    return { label: 'IV percentile', value: String(Math.round(committed)), src: 'features · 1y window', measured: true }
  }
  if (store === undefined) {
    return { label: 'IV percentile', value: '—', src: unreadSrc(read, 'IV store', 'unranked'), measured: false }
  }
  if (store == null || store.iv_current == null) {
    return { label: 'IV percentile', value: '—', src: 'no IV row — chain not collected', measured: false }
  }
  const days = store.lookback_days
  return {
    label: 'IV percentile',
    value: '—',
    src:
      days != null && days < RANK_WINDOW
        ? `IV ${(store.iv_current * 100).toFixed(0)} now · ${days}d of history — too short to rank`
        : `IV ${(store.iv_current * 100).toFixed(0)} now · not ranked by the store`,
    measured: false,
    title: 'The chain is collected and today\'s IV is read; a 1y percentile needs a year of it.',
  }
}

/**
 * What the queue's Watch button posts: the stock under its canonical key
 * (`SYM|STK|||`). It used to post `STK:SYM`, which the store has no `|` to
 * recognise in and kept as `STK:SYM|STK|||` — a second row beside the real one.
 */
export function labWatchlistItem(symbol: string): {
  contract_key: string
  symbol: string
  sec_type: 'STK'
  source: 'lab-today'
} {
  const sym = symbol.trim().toUpperCase()
  return { contract_key: stockWatchlistContractKey(sym), symbol: sym, sec_type: 'STK', source: 'lab-today' }
}
