/**
 * Agent Harness API — Research Loop Wave A + LO Orchestrator.
 *
 * Talks to bifrost-research :8795 via researchEngineUrl().
 * Envelope: `{ ok, data, error? }`.
 * Advisory only — D10 BLOCKED (no trade execution).
 */
import { POLICY_SUGGESTION_KEYS } from '@/lib/harness/harnessDraftHelpers'
import { researchEngineUrl } from '@/lib/devApiUrl'
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
  count: number
  held_count?: number
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

/** Unattended batch: run → curate → Trust-L0 narrow auto-approve (D10 research drafts only). */
export async function batchRunObjective(
  objectiveId: string,
  body?: { curate_after?: boolean },
): Promise<BatchRunResult> {
  return unwrap(
    await fetch(
      researchEngineUrl(`/research/objectives/${encodeURIComponent(objectiveId)}/batch-run`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curate_after: body?.curate_after ?? true }),
      },
    ),
  )
}

/** Archive an objective (or bring it back). Runs and lineage are untouched. */
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
        headers: { 'Content-Type': 'application/json' },
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

export async function approveAllRun(runId: string): Promise<ApproveAllResult> {
  return unwrap(
    await fetch(
      researchEngineUrl(`/research/objective-runs/${encodeURIComponent(runId)}/approve-all`),
      { method: 'POST' },
    ),
  )
}
