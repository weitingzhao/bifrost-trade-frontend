import { postControlShutdown } from '@/api/apiControl'
import type {
  WorkersResponse,
  QueuesResponse,
  WorkerProfilesResponse,
  AggregatedJobQueuesSummaryResponse,
  AggregatedJobQueueSummaryRow,
  WorkerInstancesResponse,
  ExtendedBrokerStatus,
  CeleryCapabilitiesResponse,
  AuditEntry,
  JobQueueStatusCounts,
} from '@/types/ops'
import { withValidation } from '@/lib/apiValidation'
import { opsUrl } from '@/lib/devApiUrl'
import { WorkersResponseSchema, QueuesResponseSchema } from '@/lib/schemas/ops'

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

/** Resolve token at request time (sessionStorage), matching legacy Ops client behavior. */
function resolveOpsAuthToken(explicit?: string): string {
  return (explicit ?? getOpsToken()).trim()
}

function authHeaders(explicitToken?: string): Record<string, string> {
  const t = resolveOpsAuthToken(explicitToken)
  if (!t) return {}
  return { Authorization: `Bearer ${t}` }
}

function jsonAuthHeaders(explicitToken?: string): Record<string, string> {
  return { 'Content-Type': 'application/json', ...authHeaders(explicitToken) }
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

// ── Broker ────────────────────────────────────────────────────────────────────

export async function fetchBrokerStatusExtended(): Promise<{
  ok: boolean
  broker: ExtendedBrokerStatus
  error?: string
}> {
  const r = await fetch(opsUrl('/ops/broker/status'))
  return parseJson(r)
}

// ── Celery capabilities ──────────────────────────────────────────────────────

export async function fetchCeleryCapabilities(): Promise<CeleryCapabilitiesResponse> {
  const r = await fetch(opsUrl('/ops/celery/capabilities'), {
    headers: authHeaders(),
  })
  const j = await parseJson<Record<string, unknown>>(r)
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
    beat_tasks: Array.isArray(beatRaw)
      ? (beatRaw as CeleryCapabilitiesResponse['beat_tasks'])
      : [],
    beat_running: typeof j.beat_running === 'boolean' ? j.beat_running : undefined,
    consuming_queues: Array.isArray(j.consuming_queues)
      ? j.consuming_queues.filter((queue): queue is string => typeof queue === 'string')
      : undefined,
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
      pipeline: 'stocks_ib' as const,
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
  runtime_externally_managed?: boolean
  platform_gateway_managed?: boolean
  transport?: 'platform_gateway' | 'legacy_socket' | string
  k8s_deployment?: string
  k8s_replicas?: number
  k8s_ready?: number
  k8s_scale_guard?: string | null
}

export interface OpsK8sWorkloadStatus {
  replicas: number
  ready: number
  kind: string
  mode?: string
  scale_guard?: string
}

export interface OpsHealthResponse {
  status: string
  service: string
  ts: number
  config_profile?: string
  port?: number
  executor_mode?: string
  k8s_reachable?: boolean
  k8s_namespace?: string
  daemon_scale_guard?: string
  k8s_workloads?: Record<string, OpsK8sWorkloadStatus>
}

export interface OpsCapabilities {
  ok: boolean
  identity?: { name: string; role: string; authenticated: boolean }
  capabilities?: { can_view: boolean; can_operate: boolean; can_admin: boolean }
  auth_required?: boolean
}

export async function fetchMarketIngestServices(): Promise<{
  ok: boolean
  services: MarketIngestServiceRow[]
  error?: string
}> {
  const r = await fetch(opsUrl('/ops/market-ingest/services'), {
    headers: authHeaders(),
  })
  return parseJson(r)
}

export async function controlMarketIngest(
  serviceId: string,
  action: MarketIngestAction,
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
      headers: jsonAuthHeaders(),
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

export async function clearMarketIngestConflictLeases(): Promise<{
  ok: boolean
  cleared?: string[]
  errors?: string[]
  error?: string
}> {
  const r = await fetch(opsUrl('/ops/market-ingest/clear-conflict-leases'), {
    method: 'POST',
    headers: jsonAuthHeaders(),
  })
  return parseJson(r)
}

export async function fetchOpsHealth(): Promise<OpsHealthResponse> {
  const r = await fetch(opsUrl('/ops/health'), { headers: authHeaders() })
  return parseJson(r)
}

export async function fetchOpsCapabilities(explicitToken?: string): Promise<OpsCapabilities> {
  const r = await fetch(opsUrl('/ops/auth/capabilities'), { headers: authHeaders(explicitToken) })
  return parseJson(r)
}

/** Terminate the Ops FastAPI process. Requires operator role. */
export async function postOpsShutdown(): Promise<{ ok: boolean; error?: string }> {
  return postControlShutdown(opsUrl('/ops/shutdown'))
}
