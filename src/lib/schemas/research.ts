import { z } from 'zod'

/**
 * Runtime contract schemas for the Research backend (`bifrost-research`).
 *
 * Why these exist, when the Trade-domain schemas already did:
 *
 * Research is now a **second payload** with its own release chain
 * (`bifrost-deliver-research`), released independently of the Satellite chain
 * that ships this frontend. The two can therefore move in either order — the
 * frontend may be newer than research-api (Satellite released first) or older
 * (Research released first). Before that split, "same repo, same deploy" made
 * drift practically impossible; now it is a real failure mode.
 *
 * Trade domains had 8 schemas here and Research had none, so a breaking change
 * in a Research response surfaced only as a runtime crash with no drift signal.
 * These close that gap.
 *
 * All object schemas are `.passthrough()` on purpose: additive backend changes
 * (new fields) MUST NOT warn. Only structural breakage — a required field gone,
 * or a type flip — is worth a signal. That is also the contract direction we
 * ask of the Research backend: add first, migrate, remove later.
 */

/**
 * Research API envelope. Every endpoint returns `{ ok, data }`; `error` is
 * present on failure. Validate the envelope separately from the payload so a
 * payload-shape drift does not mask an envelope-level protocol change.
 */
export const ResearchEnvelopeSchema = z
  .object({
    ok: z.boolean(),
    data: z.unknown().optional(),
    error: z.string().nullish(),
  })
  .passthrough()

// ── Copilot ─────────────────────────────────────────────────────────────
// Highest blast radius: the Copilot panel is mounted in AppLayout, so it is
// live on every page of the app, Trade pages included.

export const CopilotUsageSchema = z
  .object({
    tokens_today: z.number(),
    cost_estimate_usd: z.number(),
    cap_usd: z.number(),
    // Drives the "daily cap reached" banner and blocks input — a type flip here
    // silently disables or wrongly triggers the block.
    remaining_usd: z.number(),
    day_utc: z.string().optional(),
    bridge_count_today: z.number().optional(),
    bridge_tokens_today: z.number().optional(),
    bridge_cost_usd_today: z.number().optional(),
  })
  .passthrough()

/** GET /research/copilot/models — provider catalog for the unified model picker. */
export const CopilotModelInfoSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    provider: z.enum(['deepseek', 'anthropic', 'openai', 'ollama']),
    family: z.string(),
    cost_per_mtok_in: z.number().optional(),
    cost_per_mtok_out: z.number().optional(),
    note: z.string().optional(),
  })
  .passthrough()

export const CopilotModelsResponseSchema = z
  .object({
    available: z.array(CopilotModelInfoSchema),
    default: z.string().nullable(),
    total_catalog: z.number(),
  })
  .passthrough()

export const CopilotSessionSummarySchema = z
  .object({
    id: z.string(),
    title: z.string().nullish(),
    model: z.string().optional(),
    updated_at: z.string().optional(),
    message_count: z.number().optional(),
    pinned: z.boolean().optional(),
    group_name: z.string().nullish(),
  })
  .passthrough()

export const CopilotSessionListSchema = z
  .object({
    rows: z.array(CopilotSessionSummarySchema),
  })
  .passthrough()

export const CopilotSessionDetailSchema = z
  .object({
    session: z
      .object({
        id: z.string(),
        title: z.string().nullish(),
        model: z.string().optional(),
      })
      .passthrough(),
    messages: z.array(z.unknown()),
  })
  .passthrough()

// ── Agent drafts ────────────────────────────────────────────────────────
// Feeds InboxBanner, which renders above the message list on every chat.

export const AiDraftSchema = z
  .object({
    id: z.string(),
    kind: z.string(),
    payload: z.record(z.string(), z.unknown()),
    scope: z.string(),
    status: z.string(),
    generated_by: z.string(),
    linked_action_id: z.string().nullable(),
    created_at: z.string(),
    expires_at: z.string().nullable(),
  })
  .passthrough()

export const DraftListResponseSchema = z
  .object({
    rows: z.array(AiDraftSchema),
    count: z.number(),
    // Drives whether the banner renders at all.
    pending_count: z.number(),
    limit: z.number(),
    offset: z.number(),
  })
  .passthrough()

// ── Lab data ────────────────────────────────────────────────────────────
// Numeric rows are kept loose: engines legitimately return null for a metric
// that has no data for a date. Only the identity fields are required.

const LabRowSchema = z
  .object({
    symbol: z.string().optional(),
    trade_date: z.string().nullish(),
  })
  .passthrough()

export const VrpLatestSchema = z
  .object({
    row: LabRowSchema.nullable(),
    symbol: z.string(),
  })
  .passthrough()

export const VrpHistorySchema = z
  .object({
    rows: z.array(LabRowSchema),
  })
  .passthrough()

export const OpexCurrentSchema = z
  .object({
    row: LabRowSchema.nullable(),
    symbol: z.string(),
  })
  .passthrough()

export const VolSurfaceFitSchema = z
  .object({
    symbol: z.string(),
  })
  .passthrough()

// ── Universe reach ──────────────────────────────────────────────────────
// `symbols` is nullable on purpose: a layer that could not be counted must not
// arrive as 0, which would read as "this layer covers nothing".

export const UniverseReachLayerSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    table: z.string(),
    symbols: z.number().nullable(),
    status: z.string(),
  })
  .passthrough()

export const UniverseReachSchema = z
  .object({
    layers: z.array(UniverseReachLayerSchema),
    widest_symbols: z.number().nullable(),
    loop_symbols: z.number().nullable(),
    loop_pct_of_widest: z.number().nullable(),
    universe_modes: z.array(z.string()).optional(),
    measured: z.boolean(),
  })
  .passthrough()

// ── Candidate outcome ───────────────────────────────────────────────────
// `hit_rate` is nullable: no settled horizon yet is "not known", which must not
// render as a 0% hit rate.

export const CandidateOutcomeHorizonSchema = z
  .object({
    horizon_days: z.number(),
    settled: z.number(),
    judged: z.number(),
    hits: z.number(),
    hit_rate: z.number().nullable(),
    avg_return: z.number().nullable(),
    avg_benchmark: z.number().nullable(),
    avg_excess: z.number().nullable(),
  })
  .passthrough()

export const CandidateOutcomeSummarySchema = z
  .object({
    candidates: z.number(),
    pending: z.number(),
    horizons: z.array(CandidateOutcomeHorizonSchema),
  })
  .passthrough()

export const CandidateOutcomeRowsSchema = z
  .object({
    rows: z.array(z.record(z.string(), z.unknown())),
    count: z.number(),
  })
  .passthrough()

// ── Loop policy templates (P0-2) ────────────────────────────────────────
// The Loop's strategy is data now, not a constant compiled into two codebases.
// `.passthrough()` throughout: policy_json is the runtime's LoopPolicy dump and
// gains fields as the Loop does, so the schema guards the envelope, not the
// strategy — tightening it here would just recreate the drift this replaced.

export const PolicyTemplateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    universe_mode: z.string(),
    policy_json: z.record(z.string(), z.unknown()),
    is_default: z.boolean(),
    owner_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    // Non-fatal notes from validate_policy_for_mode — shown, never swallowed.
    warnings: z.array(z.string()).optional(),
  })
  .passthrough()

export const PolicyTemplateListSchema = z
  .object({ items: z.array(PolicyTemplateSchema) })
  .passthrough()

export const PolicyValidationSchema = z
  .object({
    policy_json: z.record(z.string(), z.unknown()),
    warnings: z.array(z.string()),
  })
  .passthrough()
