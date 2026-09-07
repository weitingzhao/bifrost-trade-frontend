/**
 * Agent Harness API — Research Loop Wave A + LO Orchestrator.
 *
 * Talks to bifrost-research :8795 via researchEngineUrl().
 * Envelope: `{ ok, data, error? }`.
 * Advisory only — D10 BLOCKED (no trade execution).
 */
import { POLICY_SUGGESTION_KEYS } from '@/lib/harness/harnessDraftHelpers'
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { AutopilotStandingSchema, RunEstimateSchema } from '@/lib/schemas/research'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import { unwrapResearchEnvelope as unwrap } from '@/lib/researchEnvelope'

export type ObjectiveStatus = 'active' | 'paused' | 'retired'
export type ObjectiveRunStatus =
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface ResearchObjective {
  id: string
  title: string
  description: string
  schedule: string
  policy_json: Record<string, unknown>
  persona: string
  status: ObjectiveStatus
  owner_id: string
  created_at: string | null
}

export interface ObjectiveRun {
  id: string
  objective_id: string
  started_at: string | null
  finished_at: string | null
  plan_json: Record<string, unknown> | null
  trace_json: unknown
  outputs: Record<string, unknown> | null
  status: ObjectiveRunStatus
}

export interface ObjectiveListResponse {
  items: ResearchObjective[]
  count: number
}

export interface ObjectiveRunListResponse {
  items: ObjectiveRun[]
  count: number
}

export interface ObjectiveCreateBody {
  title: string
  description: string
  schedule?: string
  policy_json?: Record<string, unknown>
  persona?: string
  owner_id?: string
}

export interface ApproveAllResult {
  approved: string[]
  held?: { draft_id?: string; reason?: string; blocked_by_validate?: unknown }[]
  /** Drafts approved whole. A partial leash accept promotes names without approving the draft, so this is 0 there. */
  count: number
  held_count?: number
  /** D3 — the names the leash let through, and the ones it kept with their reasons. */
  accepted_symbols?: string[]
  accepted_count?: number
  held_symbols?: { draft_id?: string; symbol?: string; reasons?: string[] }[]
  held_symbol_count?: number
  partial?: string[]
  leash?: { min_source_hit_rate?: number }
  skipped_batch?: boolean
  advisory?: string
  executed?: Record<string, unknown>[]
  errors?: { draft_id: string; status?: number; detail?: unknown }[]
}

export interface CurateRunResult {
  run_id: string
  curator_trace: Record<string, unknown>
  error?: string
}

export type UniverseMode =
  | 'stock_composite'
  | 'sepa'
  | 'momentum'
  | 'events'
  | 'scan_legacy'

export interface LoopPolicyV2 {
  universe_mode?: UniverseMode
  layers?: {
    sepa?: {
      stage?: string[]
      path?: string | null
      grade?: string | null
      min_score?: number
      required?: boolean
    }
    momentum?: {
      grade?: string | null
      min_score?: number | null
      required?: boolean
    }
    events?: {
      min_importance?: number
      within_days?: number
      required?: boolean
    }
  }
  option_overlay?: {
    enabled?: boolean
    required?: boolean
    flag_filter?: string | null
    min_composite?: number | null
    scan_preset?: string
  }
  preset?: string
  flag_filter?: string | string[] | null
  min_composite_score?: number | null
  min_hit_rate?: number | null
  /** D3 — the leash's source hit-rate floor for an unattended accept (default 0.45). */
  min_source_hit_rate?: number | null
  max_candidates?: number
  seed_symbols?: string[]
  use_llm_plan?: boolean
  auto_validate?: boolean
}

export interface HarnessFunnelStep {
  name: string
  in_count: number
  out_count: number
  filter?: string
  dropped_sample?: string[]
  optional?: boolean
  skipped?: boolean
  skip_reason?: string
}

export interface HarnessTrace {
  events: Record<string, unknown>[]
  error?: string
}

export interface ObjectiveRunDetail extends ObjectiveRun {
  objective_title?: string
  objective_policy_json?: Record<string, unknown>
}

export interface RunObjectiveResponse {
  run: ObjectiveRun
  outputs?: Record<string, unknown>
  advisory?: string
}

export async function fetchObjectives(params?: {
  status?: string
  limit?: number
}): Promise<ObjectiveListResponse> {
  const q = new URLSearchParams()
  if (params?.status != null) q.set('status', params.status)
  if (params?.limit != null) q.set('limit', String(params.limit))
  const qs = q.toString()
  return unwrap(
    await fetch(`${researchEngineUrl('/research/objectives')}${qs ? `?${qs}` : ''}`),
  )
}

export async function createObjective(body: ObjectiveCreateBody): Promise<ResearchObjective> {
  return unwrap(
    await fetch(researchEngineUrl('/research/objectives'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function runObjective(objectiveId: string): Promise<{
  run: ObjectiveRun
  outputs?: Record<string, unknown>
  advisory?: string
}> {
  return unwrap(
    await fetch(
      researchEngineUrl(`/research/objectives/${encodeURIComponent(objectiveId)}/run`),
      { method: 'POST' },
    ),
  )
}

export async function fetchObjectiveRun(runId: string): Promise<ObjectiveRunDetail> {
  return unwrap(
    await fetch(
      researchEngineUrl(`/research/objective-runs/${encodeURIComponent(runId)}`),
    ),
  )
}

export async function fetchObjectiveRuns(params?: {
  status?: string
  objective_id?: string
  limit?: number
}): Promise<ObjectiveRunListResponse> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.objective_id) q.set('objective_id', params.objective_id)
  if (params?.limit != null) q.set('limit', String(params.limit))
  const qs = q.toString()
  return unwrap(
    await fetch(`${researchEngineUrl('/research/objective-runs')}${qs ? `?${qs}` : ''}`),
  )
}

/** Delete one run. Pass ``force: true`` to cascade-clear candidates + pending drafts. */
export async function deleteObjectiveRun(
  runId: string,
  opts?: { force?: boolean },
): Promise<{
  id: string
  deleted?: boolean
  force?: boolean
  candidates_removed?: number
  drafts_dismissed?: number
}> {
  const q = opts?.force ? '?force=true' : ''
  return unwrap(
    await fetch(
      researchEngineUrl(`/research/objective-runs/${encodeURIComponent(runId)}${q}`),
      { method: 'DELETE' },
    ),
  )
}

export interface LoopTrustStatus {
  skill: string
  batch_mode_env: boolean
  trust_l0_override?: boolean
  l0: boolean
  reason: string
  advisory?: string
  /** What the Owner granted on the platform matrix — "L0", "L1", … or null when unreachable. */
  matrix_level?: string | null
  /** The grant alone. The console pill reads this; `l0` is whether *this* process may act on it. */
  matrix_l0?: boolean
}


/**
 * The autopilot as standing: trust on the cluster matrix, the next unattended
 * run, today's purse, memos waiting, and one brief per objective — what it
 * hunts, what it said last, whether its picks have been right, what it costs.
 * All reads; assembled by the run's own rules so it cannot disagree with the
 * memos it summarises.
 */
export interface AutopilotTrackRecord {
  status: 'ok' | 'none_settled' | 'unavailable' | string
  /** "objective" when the objective's own picks have settled; "source" when the harness-wide record stands in. */
  scope?: string | null
  horizon_days: number | null
  hit_rate: number | null
  judged: number
  avg_excess: number | null
  pending?: number
  days?: number
}

export interface AutopilotMemo {
  run_id: string
  started_at: string | null
  status: string | null
  headline: string
  best_conviction: number
  actionable: number
  split: number
  blocked: number
  picks: { symbol: string; action: string; conviction: number; grade: string | null }[]
  considered: number | null
}

export interface AutopilotObjective {
  id: string
  title: string | null
  status: string | null
  schedule: string | null
  hunts: string
  last_run: { id: string; started_at: string | null; finished_at: string | null; status: string | null } | null
  last_memo: AutopilotMemo | null
  track_record: AutopilotTrackRecord
  spend_30d_usd: number
  pending_memos: number
  runs: number
}

export interface AutopilotStanding {
  trust: { matrix_level: string | null; matrix_l0: boolean; source?: string; note: string }
  next_run_at: string
  purse: { spent_usd: number; cap_usd: number; providers: { provider: string; spent_usd: number; cap_usd: number; exhausted: boolean }[] }
  pending_memos: number
  best_conviction: number
  objectives: AutopilotObjective[]
}

const validateStanding = withValidation<AutopilotStanding>(AutopilotStandingSchema, 'research/loop/autopilot')

export async function fetchAutopilotStanding(): Promise<AutopilotStanding> {
  return validateStanding(unwrap<AutopilotStanding>(await fetch(researchEngineUrl('/research/loop/autopilot'))))
}

export async function fetchLoopTrust(): Promise<LoopTrustStatus> {
  return unwrap(await fetch(researchEngineUrl('/research/loop/trust')))
}

export interface BatchRunResult {
  run: ObjectiveRun
  started?: boolean
  outputs?: Record<string, unknown>
  trust?: LoopTrustStatus
  curator?: Record<string, unknown>
  curator_error?: string
  approve_all?: ApproveAllResult
  approve_skipped?: boolean
  advisory?: string
}

/**
 * What the next run would cost, from this objective's own history.
 *
 * The rate is dollars per candidate, because judging is close to linear in
 * candidates. It is measured from recent runs of this objective rather than
 * held as a constant, since it depends on how much evidence its candidates
 * carry and how many tool rounds its judges take on them.
 */
export interface RunEstimateModel {
  model: string
  usd_per_candidate: number
  usd: number
  /** "measured" from this objective's runs, or "typical" when it has none. */
  source: 'measured' | 'typical'
  runs: number
}

export interface RunEstimate {
  objective_id: string
  candidates: number
  models: RunEstimateModel[]
  triage_usd: number
  total_usd: number
  source: 'measured' | 'typical'
  runs_sampled: number
  summary: string
}

const validateEstimate = withValidation<RunEstimate>(
  RunEstimateSchema,
  'research/objectives/run-estimate',
)

export async function fetchRunEstimate(
  objectiveId: string,
  params?: { candidates?: number; models?: string[] },
): Promise<RunEstimate> {
  const q = new URLSearchParams()
  if (params?.candidates != null) q.set('candidates', String(params.candidates))
  if (params?.models?.length) q.set('models', params.models.join(','))
  const qs = q.toString()
  return validateEstimate(
    unwrap<RunEstimate>(
      await fetch(
        researchEngineUrl(
          `/research/objectives/${encodeURIComponent(objectiveId)}/run-estimate${qs ? `?${qs}` : ''}`,
        ),
      ),
    ),
  )
}

/**
 * Unattended batch: run → curate → Trust-L0 narrow auto-approve (D10 research
 * drafts only).
 *
 * The three overrides shape this run only. They are folded into a copy of the
 * objective's policy on the way in, never written back, so a run the Owner
 * shaped by hand does not silently become tomorrow's scheduled behaviour.
 */
export interface BatchRunOverrides {
  curate_after?: boolean
  judge_models?: string[]
  deep_judge_top_n?: number
  symbols?: string[]
}

export async function batchRunObjective(
  objectiveId: string,
  body?: BatchRunOverrides,
): Promise<BatchRunResult> {
  const payload: Record<string, unknown> = { curate_after: body?.curate_after ?? true }
  if (body?.judge_models?.length) payload.judge_models = body.judge_models
  if (body?.deep_judge_top_n != null) payload.deep_judge_top_n = body.deep_judge_top_n
  if (body?.symbols?.length) payload.symbols = body.symbols
  return unwrap(
    await fetch(
      researchEngineUrl(`/research/objectives/${encodeURIComponent(objectiveId)}/batch-run`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
        body: JSON.stringify(payload),
      },
    ),
  )
}

/** Archive an objective (or bring it back). Runs and lineage are untouched. */
/**
 * Edit what an objective is called, says, and when it runs — in place.
 *
 * The policy is deliberately not here: it moves through a draft
 * (`proposePolicyChange`) so the change carries a rationale and lands in the
 * same ledger a model's suggestion would.
 */
export interface ObjectivePatchBody {
  status?: 'active' | 'archived'
  title?: string
  description?: string
  schedule?: string
  persona?: string
}

export async function patchObjective(
  objectiveId: string,
  body: ObjectivePatchBody,
): Promise<ResearchObjective> {
  return unwrap<ResearchObjective>(
    await fetch(researchEngineUrl(`/research/objectives/${encodeURIComponent(objectiveId)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
      body: JSON.stringify(body),
    }),
  )
}

/** One objective, wherever it sits — the list endpoints are the only readers. */
export async function fetchObjective(objectiveId: string): Promise<ResearchObjective | null> {
  const [active, archived] = await Promise.all([
    fetchObjectives({ status: 'active', limit: 200 }),
    fetchObjectives({ status: 'archived', limit: 200 }),
  ])
  const rows = [...(active.items ?? []), ...(archived.items ?? [])]
  return rows.find((o) => o.id === objectiveId) ?? null
}

export async function setObjectiveStatus(
  objectiveId: string,
  status: 'active' | 'archived',
): Promise<ResearchObjective> {
  return unwrap<ResearchObjective>(
    await fetch(researchEngineUrl(`/research/objectives/${encodeURIComponent(objectiveId)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }),
  )
}

/**
 * The whitelist the backend enforces, so the UI offers an edit only where one
 * would actually apply. A control for a field that gets dropped at approval is
 * worse than no control — it looks like a change and is not one. One list, also
 * used by the Inbox diff table, so an editable knob and a visible diff row can
 * never disagree. The API is still the authority and answers 400 with the same
 * set.
 */
export const EDITABLE_POLICY_FIELDS = POLICY_SUGGESTION_KEYS

export type EditablePolicyField = (typeof EDITABLE_POLICY_FIELDS)[number]

export function isEditablePolicyField(key: string): key is EditablePolicyField {
  return (EDITABLE_POLICY_FIELDS as readonly string[]).includes(key)
}

/**
 * Propose a policy change as a draft, the way the model does.
 *
 * Not a direct write: routed through the Inbox so an Owner-made change leaves
 * the same record as a model-made one, which is what lets rule drift be
 * attributed to a decision rather than guessed at.
 */
export async function proposePolicyChange(
  objectiveId: string,
  suggestion: Record<string, unknown>,
  rationale: string,
): Promise<{ draft: AiDraftLike }> {
  return unwrap<{ draft: AiDraftLike }>(
    await fetch(
      researchEngineUrl(
        `/research/objectives/${encodeURIComponent(objectiveId)}/policy-suggestion`,
      ),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
        body: JSON.stringify({ suggestion, rationale }),
      },
    ),
  )
}

/** Minimal shape the caller needs back — the Inbox owns the full type. */
export interface AiDraftLike {
  id: string
  kind: string
  payload?: Record<string, unknown>
}

/** Delete an objective that never ran. The API refuses (409) once it has runs. */
export async function deleteObjective(objectiveId: string): Promise<{ id: string }> {
  return unwrap<{ id: string }>(
    await fetch(researchEngineUrl(`/research/objectives/${encodeURIComponent(objectiveId)}`), {
      method: 'DELETE',
    }),
  )
}

export async function curateRun(runId: string): Promise<CurateRunResult> {
  return unwrap(
    await fetch(
      researchEngineUrl(`/research/objective-runs/${encodeURIComponent(runId)}/curate`),
      { method: 'POST' },
    ),
  )
}

// These two endpoints resolve the acting owner from the bearer token and write
// that owner into the audit ledger, so the call has to carry one. Without it the
// ledger recorded whoever the caller claimed to be, and once RESEARCH_USERS is
// set the request is refused outright.
/**
 * Rate a run after the fact. The rating is a pure function of what the run
 * stored, so a run made before the stage existed reads as it would have on
 * the day. Research drafts only.
 */
export async function rateRun(runId: string): Promise<{ run_id: string; decision: string }> {
  return unwrap(
    await fetch(researchEngineUrl(`/research/objective-runs/${encodeURIComponent(runId)}/rate`), {
      method: 'POST',
      headers: { ...getResearchAuthHeaders() },
    }),
  )
}

export async function approveAllRun(runId: string): Promise<ApproveAllResult> {
  return unwrap(
    await fetch(
      researchEngineUrl(`/research/objective-runs/${encodeURIComponent(runId)}/approve-all`),
      { method: 'POST', headers: { ...getResearchAuthHeaders() } },
    ),
  )
}
