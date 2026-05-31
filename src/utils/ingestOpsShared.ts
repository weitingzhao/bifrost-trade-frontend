import type { MarketIngestServiceRow } from './socketIngestLamp'

export function normalizedPageDevProd(configProfile: string | null | undefined): 'dev' | 'prod' | null {
  const p = (configProfile ?? '').toLowerCase().trim()
  if (p === 'dev' || p === 'development') return 'dev'
  if (p === 'prod' || p === 'production') return 'prod'
  return null
}

/** IB services share TWS client connections and must be controlled as a group. */
const IB_SERVICE_IDS = new Set(['ib_ingestor', 'ib_market', 'ib_account_agent', 'ib_operator'])

/**
 * Per-row effective Redis control env using conflict groups:
 * - massive_ws: standalone — IB leases do not block it.
 * - IB services: grouped — any IB peer lease on the other stack blocks the whole group.
 */
export function resolveEffectiveRedisControlEnv(
  svc: { id: string; redis_control_env?: string | null },
  allRows: { id: string; redis_control_env?: string | null }[],
): string | null | undefined {
  const own = (svc.redis_control_env ?? '').toLowerCase().trim()
  if (own === 'dev' || own === 'prod') return svc.redis_control_env

  let conflictRows: typeof allRows
  if (svc.id === 'massive_ws') {
    conflictRows = []
  } else if (IB_SERVICE_IDS.has(svc.id)) {
    conflictRows = allRows.filter(r => IB_SERVICE_IDS.has(r.id))
  } else {
    conflictRows = allRows
  }

  const distinct = new Set<'dev' | 'prod'>()
  for (const r of conflictRows) {
    const v = (r.redis_control_env ?? '').toLowerCase().trim()
    if (v === 'dev' || v === 'prod') distinct.add(v)
  }
  if (distinct.size > 1) return '__stack_conflict__'
  if (distinct.size === 1) {
    const [only] = [...distinct]
    return only
  }
  return svc.redis_control_env ?? null
}

export type IngestActionBlock = 'none' | 'admin' | 'script' | 'remote_env' | 'stack_conflict'

export function ingestActionBlock(
  canOperate: boolean,
  disableIngestScript: boolean,
  pageEnv: 'dev' | 'prod' | null,
  effectiveRedisControlEnv: string | null | undefined,
): IngestActionBlock {
  if (!canOperate) return 'admin'
  if (disableIngestScript) return 'script'
  const lease = (effectiveRedisControlEnv ?? '').toLowerCase().trim()
  if (lease === '__stack_conflict__') return 'stack_conflict'
  if (pageEnv && (lease === 'dev' || lease === 'prod') && lease !== pageEnv) return 'remote_env'
  return 'none'
}

export function ingestActionBlockMessage(block: IngestActionBlock): string {
  switch (block) {
    case 'admin':
      return 'Operator role required. Enter Ops token to enable controls.'
    case 'script':
      return 'Control disabled: subprocess Ops without ingest script support.'
    case 'remote_env':
      return 'Control is held by the other stack (Redis). Stop the service from that Ops host first.'
    case 'stack_conflict':
      return 'Conflicting dev/prod Redis control leases. Stop processes on one stack first, or click Clear Leases.'
    default:
      return ''
  }
}

/** Format Unix timestamp (seconds) as HH:mm:ss local time; returns '—' if invalid. */
export function fmtTimestamp(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts) || ts <= 0) return '—'
  try {
    return new Date(ts * 1000).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '—'
  }
}

/** Format seconds as "Xs", "Xm", or "Xh"; returns '—' if null/NaN. */
export function fmtAge(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s)) return '—'
  if (s < 60) return `${Math.floor(s)}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

/** True if any service in the list has a cross-stack conflict. */
export function hasStackConflict(services: MarketIngestServiceRow[]): boolean {
  return services.some(
    svc => resolveEffectiveRedisControlEnv(svc, services) === '__stack_conflict__',
  )
}

/** Which Start/Stop button to show based on systemd process_active. */
export function ingestActionButtonsForState(processActive: string): { showStart: boolean; showStop: boolean } {
  const a = (processActive || '').toLowerCase().trim()
  if (a === 'inactive' || a === 'dead' || a === 'deactivating' || a === 'failed' || a === 'maintenance') {
    return { showStart: true, showStop: false }
  }
  if (a === 'active' || a === 'activating' || a === 'reloading' || a === 'refreshing') {
    return { showStart: false, showStop: true }
  }
  return { showStart: true, showStop: false }
}
