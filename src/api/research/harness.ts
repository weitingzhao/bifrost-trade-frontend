/**
 * Agent Harness API — Research Loop Wave A + LO Orchestrator.
 *
 * Talks to bifrost-research :8795 via researchEngineUrl().
 * Envelope: `{ ok, data, error? }`.
 * Advisory only — D10 BLOCKED (no trade execution).
 */
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
  count: number
  executed?: Record<string, unknown>[]
  errors?: { draft_id: string; status: number; detail?: unknown }[]
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

export async function runObjective(objectiveId: string): Promise<ObjectiveRun> {
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

/** Delete one run. The API refuses (409) while candidates point at it. */
export async function deleteObjectiveRun(runId: string): Promise<{ id: string }> {
  return unwrap<{ id: string }>(
    await fetch(researchEngineUrl(`/research/objective-runs/${encodeURIComponent(runId)}`), {
      method: 'DELETE',
    }),
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
