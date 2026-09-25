import { withValidation } from '@/lib/apiValidation'
import { OpsCapabilitiesSchema } from '@/lib/schemas/platform'
import { opsUrl } from '@/lib/devApiUrl'

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

const validateCapabilities = withValidation<OpsCapabilities>(
  OpsCapabilitiesSchema,
  'ops/capabilities',
)

async function parseJson<T>(r: Response): Promise<T> {
  const text = await r.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Ops API non-JSON (HTTP ${r.status})`)
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

export async function fetchOpsCapabilities(explicitToken?: string): Promise<OpsCapabilities> {
  const r = await fetch(opsUrl('/ops/auth/capabilities'), { headers: authHeaders(explicitToken) })
  return validateCapabilities(await parseJson(r))
}

