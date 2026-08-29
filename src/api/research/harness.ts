/**
 * Agent Harness API — Research Loop Wave A.
 *
 * Talks to bifrost-research :8795 via researchEngineUrl().
 * Envelope: `{ ok, data, error? }`.
 * Advisory only — D10 BLOCKED (no trade execution).
 */
import { researchEngineUrl } from '@/lib/devApiUrl'

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

interface Envelope<T> {
  ok: boolean
  data: T
  error?: string
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as Envelope<T> & { detail?: string }
  if (!res.ok || body.ok === false) {
    const msg = body.error ?? body.detail ?? `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`)
  }
  return body.data
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

export async function approveAllRun(runId: string): Promise<ApproveAllResult> {
  return unwrap(
    await fetch(
      researchEngineUrl(`/research/objective-runs/${encodeURIComponent(runId)}/approve-all`),
      { method: 'POST' },
    ),
  )
}
