import type { MarketIngestServiceRow } from './socketIngestLamp'

export type OpsHostEnvPillVariant = 'dev' | 'prod' | 'other'

export interface OpsHostEnvPill {
  shortLabel: string
  pillVariant: OpsHostEnvPillVariant
  ariaLabel: string
}

export function opsHostEnvFromConfigProfile(configProfile: string | null | undefined): OpsHostEnvPill {
  const p = (configProfile ?? '').toLowerCase().trim()
  if (p === 'dev' || p === 'development') {
    return { shortLabel: 'Dev', pillVariant: 'dev', ariaLabel: 'Development' }
  }
  if (p === 'prod' || p === 'production') {
    return { shortLabel: 'Prod', pillVariant: 'prod', ariaLabel: 'Production' }
  }
  return { shortLabel: '—', pillVariant: 'other', ariaLabel: 'Unknown environment' }
}

export function socketServicesHostColumnDisplay(opts: {
  configProfile: string | null
  localControl: string | null
  marketIngestScriptControl: boolean
}): { title: string; pill: OpsHostEnvPill } {
  const pill = opsHostEnvFromConfigProfile(opts.configProfile)
  const bits: string[] = []
  if (pill.pillVariant === 'dev') {
    bits.push('Ops config profile: dev (config.dev.yaml overlay).')
  } else if (pill.pillVariant === 'prod') {
    bits.push('Ops config profile: prod (config.prod.yaml overlay).')
  } else {
    bits.push('Ops config profile not inferred (custom path or base config.yaml only).')
  }
  if (opts.marketIngestScriptControl) {
    bits.push('Ingest control: local scripts on this Ops host (typical Mac dev).')
  } else if (opts.localControl === 'subprocess') {
    bits.push('Subprocess executor without market ingest script control.')
  } else {
    bits.push('Ingest control: systemd on this Ops host (typical Linux prod).')
  }
  return { title: bits.join(' '), pill }
}

export function runtimeControlHostDisplay(
  redisControlEnv: string | null | undefined,
  redisMetaKey: string,
  redisControlHost?: string | null,
): { title: string; pill: OpsHostEnvPill } {
  const r = (redisControlEnv ?? '').toLowerCase().trim()
  const host = (redisControlHost ?? '').trim()
  const hostSentence = host ? ` Last Ops start host: ${host}.` : ''
  if (r === 'dev' || r === 'prod') {
    const pill = opsHostEnvFromConfigProfile(r)
    const keyHint = redisMetaKey ? `${redisMetaKey}` : 'ingest meta hash'
    return {
      pill,
      title: `Ops control fields in Redis health (${keyHint}): last start from ${pill.ariaLabel}.${hostSentence} Fields bifrost_ops_control_env, bifrost_ops_control_host.`,
    }
  }
  return {
    pill: { shortLabel: '—', pillVariant: 'other', ariaLabel: 'Unclaimed' },
    title: redisMetaKey.trim()
      ? `No Ops control fields in Redis health yet (${redisMetaKey}). Starting from Ops (Dev or Prod) writes bifrost_ops_control_env and bifrost_ops_control_host.${hostSentence}`
      : 'No redis_meta_key for this row; cross-stack lease is not tracked.',
  }
}

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
      return 'Operator role required (Ops token).'
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
  if (
    a === 'inactive'
    || a === 'dead'
    || a === 'deactivating'
    || a === 'failed'
    || a === 'maintenance'
  ) {
    return { showStart: true, showStop: false }
  }
  if (a === 'active' || a === 'activating' || a === 'reloading' || a === 'refreshing') {
    return { showStart: false, showStop: true }
  }
  return { showStart: true, showStop: false }
}

/** Richer Ops error text when Account Sync Daemon start/stop fails. */
export const INGEST_CONTROL_PENDING_DIALOG_MESSAGE =
  'Command sent — Ops API is processing. You can close this dialog; watch the status lamp and process badge below.'

export function formatAccountSyncOpsError(raw: string): string {
  const m = raw.trim()
  if (m.includes('exited immediately')) {
    return `${m} Open logs/account-sync-daemon.log under the project. Typical causes: PostgreSQL or Redis URL wrong, IB Account Agent stream unavailable, or import/config errors.`
  }
  if (m.includes('ingest_already_running')) {
    return `${m} Use Stop first, or Restart instead of Start.`
  }
  if (m.includes('not found at') && m.includes('run_account_sync_daemon')) {
    return `${m} Ensure you run Ops from the repo root and scripts/systemd/run_account_sync_daemon.py exists.`
  }
  if (m.includes('sudo') && m.includes('NOPASSWD')) {
    return `${m} Linux Ops needs passwordless sudo for systemctl. On macOS, enable script-based control or start the daemon manually.`
  }
  return m
}
