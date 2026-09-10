import { z } from 'zod'

/**
 * Runtime contract schemas for the Research **data plane** — what the pipeline
 * measured, as opposed to what the Copilot and the policy layer say about it.
 *
 * Split out of `research.ts` when that file crossed the 800-line ratchet. The
 * seam is deliberate rather than arbitrary: everything here is a reading —
 * scan rows, candidates, alerts, marked-to-market PnL, hypotheses, backtests,
 * IV, screener and Greeks — and every one of them puts a figure in front of a
 * decision. `research.ts` keeps the conversational and governance surfaces.
 *
 * Same reason as the parent file: Research and Satellite release on independent
 * chains, so a field that changes type there arrives here as a number the
 * reader trusts.
 */
/* ── Scan · candidates · alerts · intents ───────────────────────────────── */

/**
 * The scan snapshot the Loop proposes from. Every lens column is nullable
 * because a symbol can be screenable on one lens and not another; a null here
 * is "this lens had nothing for this name", not a zero.
 */
export const ScanRowSchema = z
  .object({
    trade_date: z.string(),
    symbol: z.string(),
    close: z.number().nullable(),
    iv_rank_1y: z.number().nullable(),
    vrp_pct_252d: z.number().nullable(),
    composite_score: z.number().nullable(),
    lens_flags: z.record(z.string(), z.unknown()),
  })
  .passthrough()

export const ScanResponseSchema = z
  .object({
    as_of: z.string().nullable(),
    count: z.number(),
    rows: z.array(ScanRowSchema),
    universe_size: z.number(),
  })
  .passthrough()

export const ResearchCandidateSchema = z
  .object({
    id: z.string(),
    trade_date: z.string(),
    symbol: z.string(),
    source: z.string(),
    score: z.number().nullable(),
    /** The structured metrics behind the thesis — the card reads these. */
    lens_snapshot: z.record(z.string(), z.unknown()),
    tags: z.array(z.string()),
    status: z.string(),
    hypothesis_id: z.string().nullable(),
    created_at: z.string(),
  })
  .passthrough()

export const CandidateListResponseSchema = z
  .object({ items: z.array(ResearchCandidateSchema), count: z.number() })
  .passthrough()

/**
 * `severity` drives both the bell's ordering and its badge colour, so a type
 * change here silently reorders what the reader sees first.
 */
export const AnalyzeAlertSchema = z
  .object({
    trade_date: z.string(),
    kind: z.string(),
    symbol: z.string().nullable(),
    lens: z.string().nullable(),
    severity: z.string(),
    computed_at: z.string().nullable(),
  })
  .passthrough()

export const AlertsResponseSchema = z
  .object({ count: z.number(), items: z.array(AnalyzeAlertSchema) })
  .passthrough()

export const SimilarRegimeResponseSchema = z
  .object({
    lens: z.string(),
    symbol: z.string(),
    horizon: z.number(),
    k: z.number(),
    rows: z.array(z.unknown()),
    count: z.number(),
  })
  .passthrough()

export const SignalHealthResponseSchema = z
  .object({
    overall: z.string(),
    as_of: z.string(),
    freshness: z.array(z.unknown()),
    extra_tables: z.array(z.unknown()),
  })
  .passthrough()

/** D10: intents are advisory drafts. `status` gates whether the UI may act. */
export const OrderIntentDraftSchema = z
  .object({
    id: z.string(),
    kind: z.string(),
    payload: z.record(z.string(), z.unknown()),
    scope: z.string().nullable(),
    status: z.string(),
    created_at: z.string().nullable(),
  })
  .passthrough()

export const OrderIntentListResponseSchema = z
  .object({ items: z.array(OrderIntentDraftSchema), count: z.number() })
  .passthrough()

/* ── Canonical PnL ──────────────────────────────────────────────────────── */

/**
 * Marked-to-market PnL per entry cohort. Money crosses the chain boundary
 * here, so a field that changes type shows up as a figure the reader trusts.
 */
export const CanonicalPnlRowSchema = z
  .object({
    as_of_date: z.string(),
    entry_date: z.string(),
    symbol: z.string(),
    structure: z.string(),
    mtm_value: z.number().nullable(),
    pnl_since_entry: z.number().nullable(),
    final_pnl: z.number().nullable(),
    expired: z.boolean().nullable(),
    data_quality: z.string().nullable(),
  })
  .passthrough()

export const CanonicalTrajectoryResponseSchema = z
  .object({
    symbol: z.string(),
    entry_date: z.string(),
    structure: z.string(),
    rows: z.array(CanonicalPnlRowSchema),
    count: z.number(),
  })
  .passthrough()

export const CanonicalCoverageResponseSchema = z
  .object({
    symbols: z.number(),
    entry_dates: z.number(),
    rows: z.number(),
    by_quality: z.record(z.string(), z.number()),
    insufficient_pct: z.number().nullable(),
  })
  .passthrough()

/* ── Hypotheses · backtests · IV · playbook ─────────────────────────────── */

/**
 * A hypothesis as the journal stores it. `resolution_json` appears only once an
 * outcome rule settles the status, so it is optional here rather than nullable
 * — its absence is the normal state for an active thesis.
 */
export const HypothesisSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    thesis: z.string(),
    symbols: z.array(z.string()),
    tags: z.array(z.string()),
    status: z.string(),
    origin_page: z.string().nullable(),
    linked_backtest_ids: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough()

export const HypothesisListResponseSchema = z
  .object({
    rows: z.array(HypothesisSchema),
    count: z.number(),
    limit: z.number(),
    offset: z.number(),
  })
  .passthrough()

export const HypothesisSummaryActiveSchema = z
  .object({
    counts: z.record(z.string(), z.number()),
    total_active: z.number(),
    recent_active: z.array(HypothesisSchema),
  })
  .passthrough()

/** `summary` carries the win rate and average PnL the workbench ranks on. */
export const BacktestRunRowSchema = z
  .object({
    id: z.string(),
    hypothesis_id: z.string().nullable(),
    strategy_template: z.string(),
    lookback_years: z.number(),
    summary: z.record(z.string(), z.unknown()),
    created_at: z.string(),
  })
  .passthrough()

export const BacktestRunListSchema = z
  .object({ rows: z.array(BacktestRunRowSchema) })
  .passthrough()

export const EventQueryResponseSchema = z
  .object({
    run_id: z.string().nullable(),
    run: BacktestRunRowSchema,
    summary: z.record(z.string(), z.unknown()),
    runs: z.array(z.unknown()),
    skipped_events: z.number(),
    /** D10 — every backtest response carries its observe-only notice. */
    advisory: z.string(),
  })
  .passthrough()

export const IvPercentileRowSchema = z
  .object({
    symbol: z.string(),
    trade_date: z.string().nullable(),
    iv_current: z.number().nullable(),
    iv_percentile_1y: z.number().nullable(),
    iv_rank_1y: z.number().nullable(),
    lookback_days: z.number().nullable(),
  })
  .passthrough()

export const PlaybookRuleSchema = z
  .object({ id: z.string(), title: z.string(), category: z.string(), body_md: z.string() })
  .passthrough()

export const PlaybookNoteSchema = z
  .object({ id: z.string(), note_md: z.string() })
  .passthrough()

export const PlaybookCaseSchema = z
  .object({ id: z.string(), lessons_md: z.string() })
  .passthrough()

const BridgeOptionSchema = z.object({ id: z.string(), label: z.string() }).passthrough()

export const BridgePresetsSchema = z
  .object({
    focuses: z.array(BridgeOptionSchema),
    depths: z.array(BridgeOptionSchema),
    targets: z.array(BridgeOptionSchema),
    default_model: z.string(),
    default_focus: z.string(),
    default_depth: z.string(),
    default_target: z.string(),
  })
  .passthrough()

/* ── Screener · Greeks · reference ──────────────────────────────────────── */

/**
 * These four cross into Trade from the Research API and carry figures the UI
 * puts in front of a decision: strike ladders, Greeks, a company's identity,
 * and how much of the universe is actually ready to screen.
 *
 * `ok` is part of the contract rather than the envelope for this group — the
 * endpoints answer 200 with `ok: false` and an `error` string, so the flag has
 * to survive validation for the caller to branch on it.
 */
export const ScreenerResponseSchema = z
  .object({ ok: z.boolean(), groups: z.array(z.unknown()) })
  .passthrough()

export const GreeksResponseSchema = z
  .object({
    ok: z.boolean(),
    symbol: z.string(),
    trade_date: z.string(),
    stock_price: z.number().nullable(),
    risk_free_rate: z.number(),
    count: z.number(),
    rows: z.array(z.unknown()),
  })
  .passthrough()

export const TickerOverviewSchema = z.object({ ok: z.boolean() }).passthrough()

export const DataReadinessSummarySchema = z
  .object({
    universe_count: z.number(),
    tickers_active_count: z.number(),
    snapshot_populated: z.boolean(),
    snapshot_today: z.boolean(),
  })
  .passthrough()

export const PlaybookRuleListSchema = z.array(PlaybookRuleSchema)
export const PlaybookNoteListSchema = z.array(PlaybookNoteSchema)
export const PlaybookCaseListSchema = z.array(PlaybookCaseSchema)

/** SEPA readiness — `ok: false` with an `error` is a normal 200 answer here. */
export const SepaReadinessSummaryResponseSchema = z
  .object({ ok: z.boolean() })
  .passthrough()

