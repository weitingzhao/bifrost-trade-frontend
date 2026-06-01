import type {
  WorkersResponse,
  QueuesResponse,
  WorkerProfilesResponse,
  AggregatedJobQueuesSummaryResponse,
  AggregatedJobQueueSummaryRow,
  WorkerInstancesResponse,
  ExtendedBrokerStatus,
  CeleryCapabilitiesResponse,
  BrokerAction,
  ScaleAction,
  ScaleResult,
  AuditEntry,
  MassiveJobApiRow,
  BarsJob,
  JobQueueStatusCounts,
} from '@/types/ops'
import { withValidation } from '@/lib/apiValidation'
import { WorkersResponseSchema, QueuesResponseSchema } from '@/lib/schemas/ops'

const BASE = import.meta.env.VITE_API_OPS as string

const validateWorkers = withValidation<WorkersResponse>(WorkersResponseSchema, 'ops/workers')
const validateQueues = withValidation<QueuesResponse>(QueuesResponseSchema, 'ops/queues')

// ── Ops token (sessionStorage) ───────────────────────────────────────────────

const OPS_TOKEN_KEY = 'bifrost_ops_token'

export function getOpsToken(): string {
  return sessionStorage.getItem(OPS_TOKEN_KEY) ?? ''
}

export function setOpsToken(token: string): void {
  if (token) {
    sessionStorage.setItem(OPS_TOKEN_KEY, token)
  } else {
    sessionStorage.removeItem(OPS_TOKEN_KEY)
  }
}

function authHeaders(token: string): Record<string, string> {
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

function jsonAuthHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', ...authHeaders(token) }
}

function opsUrl(path: string): string {
  return `${BASE}${path}`
}

async function parseJson<T>(r: Response): Promise<T> {
  const text = await r.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Ops API non-JSON (HTTP ${r.status})`)
  }
}

// ── Workers ──────────────────────────────────────────────────────────────────

export async function fetchOpsWorkers(): Promise<WorkersResponse> {
  const res = await fetch(opsUrl('/ops/workers'))
  if (!res.ok) throw new Error(`Ops /workers: ${res.status}`)
  return validateWorkers(await res.json())
}

export async function fetchOpsQueuesSummary(): Promise<QueuesResponse> {
  const res = await fetch(opsUrl('/ops/queues/summary'))
  if (!res.ok) throw new Error(`Ops /queues/summary: ${res.status}`)
  return validateQueues(await res.json())
}

export async function fetchWorkerProfiles(): Promise<WorkerProfilesResponse> {
  const r = await fetch(opsUrl('/ops/workers/profiles'))
  return parseJson(r)
}

export async function fetchWorkerInstances(): Promise<WorkerInstancesResponse> {
  const r = await fetch(opsUrl('/ops/workers/instances'))
  return parseJson(r)
}

export async function scaleWorker(params: {
  action: ScaleAction
  instance_id?: string
  worker_type?: string
  force?: boolean
}): Promise<ScaleResult> {
  const body: Record<string, unknown> = { action: params.action }
  if (params.instance_id) body.instance_id = params.instance_id
  if (params.worker_type) body.worker_type = params.worker_type
  if (params.force === true) body.force = true
  const r = await fetch(opsUrl('/ops/workers/scale'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseJson(r)
}

// ── Broker ────────────────────────────────────────────────────────────────────

export async function fetchBrokerStatusExtended(): Promise<{
  ok: boolean
  broker: ExtendedBrokerStatus
  error?: string
}> {
  const r = await fetch(opsUrl('/ops/broker/status'))
  return parseJson(r)
}

export async function controlBroker(action: BrokerAction): Promise<{
  ok: boolean
  action?: string
  error?: string
}> {
  const r = await fetch(opsUrl('/ops/broker/control'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
  return parseJson(r)
}

// ── Celery capabilities ──────────────────────────────────────────────────────

export async function fetchCeleryCapabilities(): Promise<CeleryCapabilitiesResponse> {
  const token = getOpsToken()
  const r = await fetch(opsUrl('/ops/celery/capabilities'), {
    headers: authHeaders(token),
  })
  const j = await parseJson<Record<string, unknown>>(r)
  const matrixRaw = j.run_massive_job_matrix
  const beatRaw = j.beat_tasks
  return {
    ok: r.ok && j.ok !== false,
    registered_tasks: Array.isArray(j.registered_tasks)
      ? (j.registered_tasks as CeleryCapabilitiesResponse['registered_tasks'])
      : [],
    count: typeof j.count === 'number' ? j.count : 0,
    canonical_broker_queues: Array.isArray(j.canonical_broker_queues)
      ? (j.canonical_broker_queues as string[])
      : [],
    run_massive_job_matrix: Array.isArray(matrixRaw)
      ? (matrixRaw as CeleryCapabilitiesResponse['run_massive_job_matrix'])
      : [],
    beat_tasks: Array.isArray(beatRaw)
      ? (beatRaw as CeleryCapabilitiesResponse['beat_tasks'])
      : [],
    broker_queue_labels:
      j.broker_queue_labels && typeof j.broker_queue_labels === 'object'
        ? (j.broker_queue_labels as Record<string, string>)
        : undefined,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

// ── Aggregated job queue summary (PG counts per queue) ───────────────────────

export async function fetchAggregatedJobQueuesSummary(): Promise<AggregatedJobQueuesSummaryResponse> {
  const r = await fetch(opsUrl('/ops/jobs/queues/summary'))
  const j = await parseJson<Record<string, unknown>>(r)
  const raw = Array.isArray(j.rows) ? j.rows : []
  const rows: AggregatedJobQueueSummaryRow[] = raw.map((row: unknown) => {
    const o = row as Record<string, unknown>
    const c = o.counts as Record<string, unknown> | undefined
    const counts: JobQueueStatusCounts = {
      pending: typeof c?.pending === 'number' ? c.pending : 0,
      running: typeof c?.running === 'number' ? c.running : 0,
      done: typeof c?.done === 'number' ? c.done : 0,
      failed: typeof c?.failed === 'number' ? c.failed : 0,
    }
    return {
      profile_key: String(o.profile_key ?? ''),
      label: String(o.label ?? o.celery_queue ?? ''),
      celery_queue: String(o.celery_queue ?? ''),
      pipeline: o.pipeline === 'stocks_ib' ? 'stocks_ib' : 'massive_async',
      counts,
    }
  })
  return {
    ok: r.ok && j.ok !== false,
    rows,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export async function fetchOpsAudit(limit = 100): Promise<{
  ok: boolean
  entries: AuditEntry[]
  count: number
  error?: string
}> {
  const r = await fetch(opsUrl(`/ops/audit?limit=${limit}`))
  return parseJson(r)
}

// ── Bars jobs (/ops/bars/jobs) ───────────────────────────────────────────────

function barsJobsUrl(path: string): string {
  return opsUrl(`/ops/bars/jobs${path}`)
}

export async function fetchBarsJobs(
  limit = 25,
  offset = 0,
  status?: string | null,
): Promise<{ jobs: BarsJob[]; total: number; error?: string }> {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  if (status && status !== 'all') params.set('status', status)
  const r = await fetch(barsJobsUrl(`?${params}`))
  if (!r.ok) throw new Error(`/ops/bars/jobs: ${r.status}`)
  const j = await parseJson<Record<string, unknown>>(r)
  return {
    jobs: Array.isArray(j.jobs) ? (j.jobs as BarsJob[]) : [],
    total: typeof j.total === 'number' ? j.total : 0,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

export async function deleteAllBarsJobs(
  status?: string | null,
): Promise<{ ok: boolean; deleted: number; error?: string }> {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  const r = await fetch(barsJobsUrl(`?${params}`), { method: 'DELETE' })
  const j = await parseJson<Record<string, unknown>>(r)
  return {
    ok: r.ok && j.ok !== false,
    deleted: typeof j.deleted === 'number' ? j.deleted : 0,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

export async function postRetryBarsJob(
  jobId: string,
): Promise<{ ok: boolean; error?: string; job?: BarsJob }> {
  const r = await fetch(barsJobsUrl(`/${encodeURIComponent(jobId)}/retry`), { method: 'POST' })
  const j = await parseJson<Record<string, unknown>>(r)
  return {
    ok: r.ok && j.ok === true,
    error: typeof j.error === 'string' ? j.error : undefined,
    job: j.job as BarsJob | undefined,
  }
}

export async function postRetryFailedBarsJobs(limit = 100): Promise<{
  ok: boolean
  error?: string
  reset?: number
  enqueued?: number
  enqueue_errors?: { job_id: string; error: string }[]
}> {
  const params = new URLSearchParams({ limit: String(Math.max(1, Math.min(500, limit))) })
  const r = await fetch(barsJobsUrl(`/retry-failed?${params}`), { method: 'POST' })
  const j = await parseJson<Record<string, unknown>>(r)
  return {
    ok: r.ok && j.ok === true,
    error: typeof j.error === 'string' ? j.error : undefined,
    reset: typeof j.reset === 'number' ? j.reset : undefined,
    enqueued: typeof j.enqueued === 'number' ? j.enqueued : undefined,
    enqueue_errors: Array.isArray(j.enqueue_errors)
      ? (j.enqueue_errors as { job_id: string; error: string }[])
      : undefined,
  }
}

export async function trimBarsJobs(
  keep: number,
): Promise<{ ok: boolean; deleted: number; error?: string }> {
  const params = new URLSearchParams({ keep: String(keep) })
  const r = await fetch(barsJobsUrl(`/trim?${params}`), { method: 'POST' })
  const j = await parseJson<Record<string, unknown>>(r)
  return {
    ok: r.ok && j.ok !== false,
    deleted: typeof j.deleted === 'number' ? j.deleted : 0,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

// ── Massive jobs (/ops/research/massive/jobs) ─────────────────────────────────

function massiveJobsUrl(path: string): string {
  const p = path.startsWith('?') ? path : path.startsWith('/') ? path : `/${path}`
  return opsUrl(`/ops/research/massive/jobs${p}`)
}

export async function fetchMassiveJobsList(options?: {
  limit?: number
  offset?: number
  status?: string
  celery_queue?: string
}): Promise<{ ok: boolean; jobs: MassiveJobApiRow[]; error?: string }> {
  const q = new URLSearchParams()
  if (options?.limit != null) q.set('limit', String(options.limit))
  if (options?.offset != null) q.set('offset', String(options.offset))
  if (options?.status?.trim()) q.set('status', options.status.trim())
  if (options?.celery_queue?.trim()) q.set('celery_queue', options.celery_queue.trim())
  const r = await fetch(massiveJobsUrl(`?${q}`))
  const j = await parseJson<Record<string, unknown>>(r)
  if (!j.ok) {
    return {
      ok: false,
      jobs: [],
      error: typeof j.error === 'string' ? j.error : 'Request failed',
    }
  }
  const raw = Array.isArray(j.jobs) ? j.jobs : []
  const jobs: MassiveJobApiRow[] = raw.map((row: unknown) => {
    const o = row as Record<string, unknown>
    return {
      job_id: String(o.job_id ?? ''),
      type: typeof o.type === 'string' ? o.type : undefined,
      kind: typeof o.kind === 'string' ? o.kind : undefined,
      goal: typeof o.goal === 'string' ? o.goal : undefined,
      status: typeof o.status === 'string' ? o.status : undefined,
      result: o.result,
      created_ts: typeof o.created_ts === 'number' ? o.created_ts : undefined,
      updated_ts: typeof o.updated_ts === 'number' ? o.updated_ts : undefined,
    }
  })
  return { ok: true, jobs }
}

export async function deleteAllMassiveJobs(
  status?: string | null,
  celeryQueue?: string | null,
): Promise<{ ok: boolean; deleted: number; error?: string }> {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  if (celeryQueue?.trim()) params.set('celery_queue', celeryQueue.trim())
  const qs = params.toString()
  const r = await fetch(massiveJobsUrl(`/purge${qs ? `?${qs}` : ''}`), { method: 'POST' })
  const j = await parseJson<Record<string, unknown>>(r)
  return {
    ok: r.ok && j.ok !== false,
    deleted: typeof j.deleted === 'number' ? j.deleted : 0,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

export async function postRetryMassiveJob(
  jobId: string,
): Promise<{ ok: boolean; error?: string; job?: MassiveJobApiRow }> {
  const r = await fetch(massiveJobsUrl(`/${encodeURIComponent(jobId)}/retry`), { method: 'POST' })
  const j = await parseJson<Record<string, unknown>>(r)
  const raw = j.job as Record<string, unknown> | undefined
  const job: MassiveJobApiRow | undefined =
    raw && typeof raw === 'object'
      ? {
          job_id: String(raw.job_id ?? ''),
          type: typeof raw.type === 'string' ? raw.type : undefined,
          kind: typeof raw.kind === 'string' ? raw.kind : undefined,
          goal: typeof raw.goal === 'string' ? raw.goal : undefined,
          status: typeof raw.status === 'string' ? raw.status : undefined,
          result: raw.result,
          created_ts: typeof raw.created_ts === 'number' ? raw.created_ts : undefined,
          updated_ts: typeof raw.updated_ts === 'number' ? raw.updated_ts : undefined,
        }
      : undefined
  return {
    ok: r.ok && j.ok === true,
    error: typeof j.error === 'string' ? j.error : undefined,
    job,
  }
}

export async function postRetryFailedMassiveJobs(
  celeryQueue: string,
  limit = 500,
): Promise<{
  ok: boolean
  error?: string
  reset?: number
  enqueued?: number
  enqueue_errors?: { job_id: string; error: string }[]
}> {
  const params = new URLSearchParams({ limit: String(Math.max(1, Math.min(2000, limit))) })
  if (celeryQueue.trim()) params.set('celery_queue', celeryQueue.trim())
  const r = await fetch(massiveJobsUrl(`/retry-failed?${params}`), { method: 'POST' })
  const j = await parseJson<Record<string, unknown>>(r)
  return {
    ok: r.ok && j.ok === true,
    error: typeof j.error === 'string' ? j.error : undefined,
    reset: typeof j.reset === 'number' ? j.reset : undefined,
    enqueued: typeof j.enqueued === 'number' ? j.enqueued : undefined,
    enqueue_errors: Array.isArray(j.enqueue_errors)
      ? (j.enqueue_errors as { job_id: string; error: string }[])
      : undefined,
  }
}

export async function trimMassiveJobs(
  keep: number,
  celeryQueue?: string | null,
): Promise<{ ok: boolean; deleted: number; error?: string }> {
  const params = new URLSearchParams({ keep: String(keep) })
  if (celeryQueue?.trim()) params.set('celery_queue', celeryQueue.trim())
  const r = await fetch(massiveJobsUrl(`/trim?${params}`), { method: 'POST' })
  const j = await parseJson<Record<string, unknown>>(r)
  return {
    ok: r.ok && j.ok !== false,
    deleted: typeof j.deleted === 'number' ? j.deleted : 0,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

// ── Market ingest services (Socket page) ──────────────────────────────────────

export type MarketIngestAction = 'start' | 'stop' | 'restart' | 'reset'

export interface MarketIngestServiceRow {
  id: string
  label: string
  systemd_unit: string
  redis_meta_key: string
  process_active: string
  redis_control_env?: string | null
  redis_control_host?: string | null
  redis_control_updated_at?: number | null
}

export interface OpsHealthResponse {
  status: string
  service: string
  ts: number
  config_profile?: string
  port?: number
  executor_mode?: string
  local_control?: string
  market_ingest_script_control?: boolean
  agent_socket?: string
  agent_reachable?: boolean
  agent_error?: string
}

export interface OpsCapabilities {
  ok: boolean
  identity?: { name: string; role: string; authenticated: boolean }
  capabilities?: { can_view: boolean; can_operate: boolean; can_admin: boolean }
  auth_required?: boolean
}

export async function fetchMarketIngestServices(token: string): Promise<{
  ok: boolean
  services: MarketIngestServiceRow[]
  error?: string
}> {
  const r = await fetch(opsUrl('/ops/market-ingest/services'), {
    headers: authHeaders(token),
  })
  return parseJson(r)
}

export async function controlMarketIngest(
  serviceId: string,
  action: MarketIngestAction,
  token: string,
): Promise<{
  ok: boolean
  queued?: boolean
  service_id?: string
  action?: string
  result?: Record<string, unknown>
  error?: string
}> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 120_000)
  try {
    const r = await fetch(opsUrl('/ops/market-ingest/control'), {
      method: 'POST',
      headers: jsonAuthHeaders(token),
      body: JSON.stringify({ service_id: serviceId, action }),
      signal: controller.signal,
    })
    const data = await parseJson<Record<string, unknown>>(r)
    if (data.ok === true || r.ok) {
      return {
        ok: true,
        queued: typeof data.queued === 'boolean' ? data.queued : undefined,
        service_id: typeof data.service_id === 'string' ? data.service_id : undefined,
        action: typeof data.action === 'string' ? data.action : undefined,
        result: data.result as Record<string, unknown> | undefined,
        error: typeof data.error === 'string' ? data.error : undefined,
      }
    }
    const msg =
      (typeof data.error === 'string' && data.error) ||
      (typeof data.detail === 'string' && data.detail) ||
      `HTTP ${r.status}`
    throw new Error(msg)
  } finally {
    clearTimeout(id)
  }
}

export async function clearMarketIngestConflictLeases(token: string): Promise<{
  ok: boolean
  cleared?: string[]
  errors?: string[]
  error?: string
}> {
  const r = await fetch(opsUrl('/ops/market-ingest/clear-conflict-leases'), {
    method: 'POST',
    headers: jsonAuthHeaders(token),
  })
  return parseJson(r)
}

export async function fetchOpsHealth(token: string): Promise<OpsHealthResponse> {
  const r = await fetch(opsUrl('/ops/health'), { headers: authHeaders(token) })
  return parseJson(r)
}

export async function fetchOpsCapabilities(token: string): Promise<OpsCapabilities> {
  const r = await fetch(opsUrl('/ops/auth/capabilities'), { headers: authHeaders(token) })
  return parseJson(r)
}
