export const API_HEALTH_FETCH_TIMEOUT_MS = 8_000

export type ApiOriginBase = string

function joinApiOrigin(origin: ApiOriginBase, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const o = origin.replace(/\/$/, '')
  return o ? `${o}${p}` : p
}

async function fetchJsonAt(
  origin: ApiOriginBase,
  path: string,
  timeoutMs = API_HEALTH_FETCH_TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  const url = joinApiOrigin(origin, path)
  const r = await fetch(url, {
    credentials: 'omit',
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const j = await r.json()
  return j != null && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, unknown>) : {}
}

export async function fetchHealthAtOrigin(
  origin: ApiOriginBase,
  options?: { timeoutMs?: number },
): Promise<{ status: string; service: string; ts: number; config_profile?: string }> {
  const j = await fetchJsonAt(origin, '/health', options?.timeoutMs ?? API_HEALTH_FETCH_TIMEOUT_MS)
  return {
    status: String(j.status ?? 'unknown'),
    service: String(j.service ?? 'bifrost-server'),
    ts: typeof j.ts === 'number' ? j.ts : 0,
    config_profile: typeof j.config_profile === 'string' ? j.config_profile : undefined,
  }
}

export async function fetchMassiveApiHealthAtOrigin(
  origin: ApiOriginBase,
  options?: { timeoutMs?: number },
): Promise<{ status: string; service: string; ts: number; config_profile?: string | null }> {
  const j = await fetchJsonAt(
    origin,
    '/research/massive/health',
    options?.timeoutMs ?? API_HEALTH_FETCH_TIMEOUT_MS,
  )
  return {
    status: String(j.status ?? 'unknown'),
    service: String(j.service ?? 'bifrost-massive'),
    ts: typeof j.ts === 'number' ? j.ts : 0,
    config_profile: typeof j.config_profile === 'string' ? j.config_profile : null,
  }
}

export async function fetchDocsApiHealthAtOrigin(
  origin: ApiOriginBase,
  options?: { timeoutMs?: number },
): Promise<{ status: string; service: string; ts: number; config_profile?: string | null }> {
  const j = await fetchJsonAt(origin, '/health', options?.timeoutMs ?? API_HEALTH_FETCH_TIMEOUT_MS)
  return {
    status: String(j.status ?? 'unknown'),
    service: String(j.service ?? 'bifrost-docs'),
    ts: typeof j.ts === 'number' ? j.ts : 0,
    config_profile: typeof j.config_profile === 'string' ? j.config_profile : null,
  }
}

function joinServiceBase(base: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const b = base.replace(/\/$/, '')
  return b ? `${b}${p}` : p
}

export async function fetchOpsHealthAtOrigin(
  origin: ApiOriginBase,
  options?: { timeoutMs?: number },
): Promise<{ status: string; service: string; ts: number; config_profile?: string }> {
  const url = joinServiceBase(origin, '/ops/health')
  const r = await fetch(url, {
    credentials: origin ? 'omit' : 'same-origin',
    signal: AbortSignal.timeout(options?.timeoutMs ?? API_HEALTH_FETCH_TIMEOUT_MS),
  })
  if (!r.ok) throw new Error(`Ops health: ${r.status}`)
  const j = (await r.json()) as Record<string, unknown>
  return {
    status: String(j.status ?? 'unknown'),
    service: String(j.service ?? 'bifrost-ops'),
    ts: typeof j.ts === 'number' ? j.ts : 0,
    config_profile: typeof j.config_profile === 'string' ? j.config_profile : undefined,
  }
}

export async function fetchResearchApiHealthAtOrigin(
  origin: ApiOriginBase,
  options?: { timeoutMs?: number },
): Promise<{ status: string; service: string; ts: number }> {
  const j = await fetchJsonAt(origin, '/health', options?.timeoutMs ?? API_HEALTH_FETCH_TIMEOUT_MS)
  return {
    status: String(j.status ?? 'unknown'),
    service: String(j.service ?? 'bifrost-research'),
    ts: typeof j.ts === 'number' ? j.ts : 0,
  }
}
