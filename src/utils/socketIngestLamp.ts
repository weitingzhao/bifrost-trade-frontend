import {
  ibBrokerLogicalSummary,
  ibBrokerRedisHealthLamp,
  normalizeIbBrokerStatus,
  type IbBrokerServiceId,
} from '@/components/socket/ibBrokerConnectionModel'
import type { StatusResponse, StatusSocketMassive } from '@/types/monitor'
import { isPlatformIbGatewayActive, platformIbGatewayAggregateLamp } from '@/utils/platformIbGateway'

export type IngestLamp = 'green' | 'yellow' | 'red' | 'gray'
export type AggregateIngestLamp = IngestLamp | 'none'
export type LocalControlAgentLamp = 'green' | 'yellow' | 'red'

export type IngestCategory = 'Massive' | 'IB' | 'Engine' | 'Other'

export const INGEST_CATEGORY_LABELS: Record<IngestCategory, string> = {
  Massive: 'Massive Options WS',
  IB: 'Platform IB Gateway (redis-ib)',
  Engine: 'Strategy Trading',
  Other: 'Other',
}

export function categoryForServiceId(id: string): IngestCategory {
  if (id === 'massive_ws') return 'Massive'
  if (id === 'ib_ingestor' || id === 'ib_market' || id === 'ib_operator' || id === 'ib_account_agent') {
    return 'IB'
  }
  if (id === 'account_sync_daemon') return 'Engine'
  if (id === 'trading_engine') return 'Engine'
  return 'Other'
}

/** Options Starter REST-only standby — process healthy without Polygon WS connected. */
export function massiveWsRestOnly(m: StatusSocketMassive | null | undefined): boolean {
  return (m?.ws_mode ?? '').trim().toLowerCase() === 'rest_only'
}

export function buildUnifiedIngestRows(
  services: MarketIngestServiceRow[],
): { svc: MarketIngestServiceRow; category: IngestCategory }[] {
  const filtered = marketIngestServicesForSocketAggregate(services)
  const byCat: Record<IngestCategory, MarketIngestServiceRow[]> = {
    Massive: [],
    IB: [],
    Engine: [],
    Other: [],
  }
  for (const s of filtered) {
    byCat[categoryForServiceId(s.id)].push(s)
  }
  const out: { svc: MarketIngestServiceRow; category: IngestCategory }[] = []
  for (const s of byCat.Massive) out.push({ svc: s, category: 'Massive' })
  for (const s of byCat.IB) out.push({ svc: s, category: 'IB' })
  for (const s of byCat.Engine) out.push({ svc: s, category: 'Engine' })
  for (const s of byCat.Other) out.push({ svc: s, category: 'Other' })
  return out
}

export function localControlAgentLamp(reachable: boolean | null | undefined): LocalControlAgentLamp {
  if (reachable === true) return 'green'
  if (reachable === false) return 'red'
  return 'yellow'
}

function fmtAgeShort(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s)) return '—'
  if (s < 60) return `${Math.floor(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

function ingestProcessRunning(processActive: string | undefined): boolean {
  const a = (processActive || '').toLowerCase().trim()
  return a === 'active' || a === 'activating'
}

const MASSIVE_SERVICE_HEARTBEAT_SLACK_SEC = 15

/** Service liveness from Redis health hash (not Polygon quote age). */
export function massiveServiceHeartbeatState(
  massive: StatusSocketMassive | null | undefined,
  elapsed: number,
): {
  intervalSec: number
  nextInS: number | null
  overdue: boolean
  critical: boolean
  ok: boolean
} {
  const m = massive
  const intervalSec = Number(m?.service_heartbeat_interval_sec) > 0
    ? Number(m?.service_heartbeat_interval_sec)
    : 30
  const healthAge =
    m?.health_updated_age_s != null && Number.isFinite(Number(m.health_updated_age_s))
      ? Math.max(0, Number(m.health_updated_age_s) + elapsed)
      : null
  const nextRaw =
    m?.next_service_heartbeat_in_s != null && Number.isFinite(Number(m.next_service_heartbeat_in_s))
      ? Number(m.next_service_heartbeat_in_s)
      : null
  const nextInS = nextRaw != null ? Math.max(0, nextRaw - elapsed) : null
  const overdue =
    healthAge != null
      ? healthAge > intervalSec + MASSIVE_SERVICE_HEARTBEAT_SLACK_SEC
      : nextInS != null
        ? nextInS <= 0 && (healthAge ?? intervalSec + 1) > intervalSec
        : false
  const critical = healthAge != null ? healthAge > intervalSec + 90 : false
  const ok = !overdue && !critical
  return { intervalSec, nextInS, overdue, critical, ok }
}

export function massiveHealthUpdatedAgeS(
  massive: StatusSocketMassive | null | undefined,
  elapsed: number,
): number | null {
  const m = massive
  if (m?.health_updated_age_s == null || !Number.isFinite(Number(m.health_updated_age_s))) {
    return null
  }
  return Math.max(0, Number(m.health_updated_age_s) + elapsed)
}

export type IngestOpsPending = 'starting' | 'stopping' | null

/** Daemon rows use Monitor heartbeat for Ops transition completion (not only docker process_active). */
export function daemonServiceHealthAlive(
  serviceId: string,
  status: StatusResponse | null | undefined,
): boolean | null {
  if (serviceId === 'trading_engine') {
    return status?.daemon?.heartbeat?.daemon_alive === true
  }
  if (serviceId === 'account_sync_daemon') {
    return status?.account_sync_daemon?.heartbeat?.daemon_alive === true
  }
  return null
}

export function buildIngestLogicalSummary(
  svc: MarketIngestServiceRow,
  status: StatusResponse | null | undefined,
  processActive?: string,
  pending: IngestOpsPending = null,
): string {
  if (pending === 'starting') {
    if (svc.id === 'account_sync_daemon') {
      return 'Starting… connecting PostgreSQL and IB account stream consumer'
    }
    if (svc.id === 'trading_engine') {
      return 'Starting… waiting for daemon heartbeat and IB edge health'
    }
    const proc = (processActive || 'unknown').toLowerCase()
    return `Starting… (process ${proc})`
  }
  if (pending === 'stopping') {
    if (svc.id === 'account_sync_daemon') {
      return 'Stopping… clearing Redis health and pausing sync loop'
    }
    if (svc.id === 'trading_engine') {
      return 'Stopping… waiting for graceful shutdown and heartbeat to clear'
    }
    const proc = (processActive || 'unknown').toLowerCase()
    return `Stopping… (process ${proc})`
  }
  const massive = status?.socket?.massive
  if (svc.id === 'massive_ws' && massive) {
    if (massiveWsRestOnly(massive)) {
      const hb = massive.next_service_heartbeat_in_s != null
        ? `; svc HB ~${fmtAgeShort(massive.next_service_heartbeat_in_s)}`
        : massive.health_updated_age_s != null
          ? `; health ${fmtAgeShort(massive.health_updated_age_s)} ago`
          : ''
      return `REST-only standby (Options Starter); process active${hb}`
    }
    const wsUp = ingestRedisTruthyConnected(massive.ws_connected)
    const ws = wsUp ? 'connected' : 'disconnected'
    const rc = massive.ws_reconnects != null ? String(massive.ws_reconnects) : '—'
    const proc = ingestProcessRunning(processActive)
      ? (wsUp ? 'process active' : 'process active, WS down')
      : 'process stopped'
    const hb = massive.next_service_heartbeat_in_s != null
      ? `; svc HB ~${fmtAgeShort(massive.next_service_heartbeat_in_s)}`
      : massive.health_updated_age_s != null
        ? `; health ${fmtAgeShort(massive.health_updated_age_s)} ago`
        : ''
    const quoteAge = massive.last_msg_age_s != null
      ? `last quote ${fmtAgeShort(massive.last_msg_age_s)}`
      : 'last quote —'
    return `WS ${ws}; ${proc}; ${quoteAge}${hb}; reconnects ${rc}`
  }
  const ibSvcId: IbBrokerServiceId | null =
    svc.id === 'ib_market' || svc.id === 'ib_ingestor'
      ? 'ib_ingestor'
      : svc.id === 'ib_account_agent'
        ? 'ib_account_agent'
        : svc.id === 'ib_operator'
          ? 'ib_operator'
          : null
  if (ibSvcId) {
    const view = normalizeIbBrokerStatus(ibSvcId, status)
    if (view) return ibBrokerLogicalSummary(ibSvcId, view)
  }
  if (svc.id === 'trading_engine') {
    const hb = status?.daemon?.heartbeat
    if (hb?.daemon_alive && hb.last_ts != null) {
      const age = fmtAgeShort(Date.now() / 1000 - hb.last_ts)
      const hints: string[] = [`Daemon alive; last heartbeat ${age} ago`]
      if (hb.ib_connected === false) hints.push('IB edge not connected')
      if (status?.daemon?.trading?.trading_suspended) hints.push('trading suspended')
      return hints.join('; ')
    }
    if (hb?.graceful_shutdown_at != null) {
      return 'Graceful stop recorded (GET /status daemon.heartbeat)'
    }
    if (hb?.last_ts != null) {
      const age = fmtAgeShort(Date.now() / 1000 - hb.last_ts)
      return `Heartbeat stale (${age} ago); start process or check logs`
    }
    return 'Monitor /status heartbeat (not Redis ingest meta)'
  }
  if (svc.id === 'account_sync_daemon') {
    const hb = status?.account_sync_daemon?.heartbeat
    if (hb?.daemon_alive && hb.last_ts != null) {
      const age = fmtAgeShort(Date.now() / 1000 - hb.last_ts)
      const ver = hb.last_sync_version ?? 0
      const lag = hb.stream_lag ?? 0
      const lagHint = lag > 5 ? `; stream lag ${lag}` : ''
      return `Alive; last sync heartbeat ${age} ago; sync v${ver}${lagHint}`
    }
    if (hb?.last_ts != null) {
      const age = fmtAgeShort(Date.now() / 1000 - hb.last_ts)
      return `Heartbeat stale (${age} ago); Ops start or check account-sync logs`
    }
    return 'GET /status account_sync_daemon (PostgreSQL heartbeat)'
  }
  if (svc.redis_meta_key) return `Meta: ${svc.redis_meta_key}`
  return '—'
}

export function ingestRowUsesConnectionColumn(svc: MarketIngestServiceRow, category: IngestCategory): boolean {
  if (category === 'IB') return true
  return svc.id === 'massive_ws'
}

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
}

/**
 * Services included in the Socket aggregate lamp.
 * Excludes trading_engine (Daemon) and account_sync_daemon (PostgreSQL sync).
 */
export function marketIngestServicesForSocketAggregate(
  services: MarketIngestServiceRow[],
): MarketIngestServiceRow[] {
  return services.filter(s => s.id !== 'trading_engine' && s.id !== 'account_sync_daemon')
}

/**
 * Safely parse Redis `connected` field — may arrive as bool, number, or string in legacy payloads.
 */
export function ingestRedisTruthyConnected(v: unknown): boolean {
  if (v === true) return true
  if (v === false || v === null || v === undefined) return false
  if (typeof v === 'number' && Number.isFinite(v)) return v !== 0
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    return s === '1' || s === 'true' || s === 'yes'
  }
  return false
}

/** True when IB probe fields indicate staleness or failure. */
export function ibSlotProbeUnhealthy(
  slot:
    | { ib_probe_stale?: boolean; ib_probe_ok?: boolean; last_ib_probe_at?: number | null }
    | null
    | undefined,
): boolean {
  if (!slot) return false
  if (slot.ib_probe_stale === true) return true
  if (
    typeof slot.last_ib_probe_at === 'number' &&
    slot.last_ib_probe_at > 0 &&
    slot.ib_probe_ok === false
  ) {
    return true
  }
  return false
}

/** Green = active; red = inactive/failed/dead; yellow = transitional; gray = unknown. */
export function ingestProcessLamp(active: string): IngestLamp {
  const a = (active || '').toLowerCase().trim()
  if (a === 'active') return 'green'
  if (a === 'inactive' || a === 'failed' || a === 'dead') return 'red'
  if (a === 'activating' || a === 'deactivating' || a === 'reloading' || a === 'maintenance' || a === 'refreshing') {
    return 'yellow'
  }
  return 'gray'
}

/**
 * Redis health lamp for a single ingest service, derived from Monitor GET /status socket.*.
 * Independent of Ops systemd state — Redis is shared across Dev/Prod stacks.
 */
export function ingestRedisHealthLamp(
  serviceId: string,
  status: StatusResponse | null | undefined,
  processActive?: string,
): { lamp: IngestLamp; title: string } {
  const id = serviceId === 'ib_market' ? 'ib_ingestor' : serviceId

  if (!status) {
    return { lamp: 'gray', title: 'Monitor GET /status not loaded yet.' }
  }

  if (id === 'massive_ws') {
    const m = status.socket?.massive
    if (m == null) {
      return { lamp: 'gray', title: 'Massive block missing from /status socket (Redis meta unavailable).' }
    }
    if (m.ws_connected === null || m.ws_connected === undefined) {
      return { lamp: 'gray', title: 'Massive WS not reported (no Redis URL or empty meta in /status).' }
    }
    const healthAge =
      typeof m.health_updated_age_s === 'number' && Number.isFinite(m.health_updated_age_s)
        ? m.health_updated_age_s
        : typeof m.last_msg_age_s === 'number' && Number.isFinite(m.last_msg_age_s)
          ? m.last_msg_age_s
          : null
    const hbIv = Number(m.service_heartbeat_interval_sec) > 0
      ? Number(m.service_heartbeat_interval_sec)
      : 30
    if (healthAge !== null && healthAge > hbIv + 90) {
      return {
        lamp: 'red',
        title: `Massive WS service heartbeat stale (${Math.floor(healthAge)}s) — check massive-ws process (bifrost:health:ws_massive_option).`,
      }
    }
    if (healthAge !== null && healthAge > hbIv + MASSIVE_SERVICE_HEARTBEAT_SLACK_SEC) {
      return {
        lamp: 'yellow',
        title: `Massive WS service heartbeat overdue (${Math.floor(healthAge)}s) — Redis health write delayed.`,
      }
    }
    if (massiveWsRestOnly(m)) {
      return {
        lamp: 'green',
        title:
          'Massive ingest healthy (REST-only standby; Options Starter uses Celery aggregates, not live WS).',
      }
    }
    if (ingestRedisTruthyConnected(m.ws_connected)) {
      return { lamp: 'green', title: 'Massive WS ingest healthy (connected; service heartbeat OK).' }
    }
    const processRunning = ingestProcessRunning(processActive)
    if (processRunning) {
      if (healthAge !== null && healthAge > hbIv + 90) {
        return {
          lamp: 'red',
          title: `Massive WS process running but service heartbeat stale (${Math.floor(healthAge)}s) — check logs / Polygon auth.`,
        }
      }
      return {
        lamp: 'yellow',
        title:
          'Massive WS ingest process running; Polygon WebSocket not connected (reconnecting, auth probe, or market closed).',
      }
    }
    return { lamp: 'red', title: 'Massive WS not connected (Redis bifrost:health:ws_massive_option).' }
  }

  if (id === 'ib_ingestor' || id === 'ib_account_agent' || id === 'ib_operator') {
    return ibBrokerRedisHealthLamp(id, status, processActive)
  }

  if (id === 'trading_engine') {
    const hb = status.daemon?.heartbeat
    if (hb == null) {
      return { lamp: 'gray', title: 'Strategy Trading Daemon heartbeat not in GET /status yet.' }
    }
    if (hb.daemon_alive === true) {
      return {
        lamp: 'green',
        title: 'Strategy Trading Daemon alive (Monitor GET /status daemon.heartbeat.daemon_alive).',
      }
    }
    if (hb.graceful_shutdown_at != null && Number.isFinite(hb.graceful_shutdown_at)) {
      return {
        lamp: 'yellow',
        title: 'Strategy Trading Daemon not running; graceful_shutdown_at set (SIGTERM or control stop).',
      }
    }
    return {
      lamp: 'red',
      title: 'Strategy Trading Daemon not running or heartbeat stale (check systemd / local process).',
    }
  }

  if (id === 'account_sync_daemon') {
    const asd = status.account_sync_daemon?.heartbeat
    if (asd == null) {
      return {
        lamp: 'gray',
        title: 'Account Sync Daemon block missing from GET /status (PostgreSQL heartbeat or Redis health).',
      }
    }
    if (asd.daemon_alive === true) {
      return {
        lamp: 'green',
        title: 'Account Sync Daemon alive (GET /status account_sync_daemon.heartbeat).',
      }
    }
    return {
      lamp: 'red',
      title: 'Account Sync Daemon not running or heartbeat stale (start systemd unit or run script).',
    }
  }

  return { lamp: 'gray', title: 'Unknown ingest service id for Redis health.' }
}

/** Status lamp + summary for Ops table; aligns Status with Actions during start/stop transitions. */
export function resolveIngestOpsRowDisplay(opts: {
  svc: MarketIngestServiceRow
  status: StatusResponse | null | undefined
  processActive: string
  isStarting: boolean
  isStopping: boolean
  hostUnclaimed: boolean
  runtimeExternallyManaged?: boolean
}): { lamp: IngestLamp; title: string; logicalText: string } {
  const { svc, status, processActive, isStarting, isStopping, hostUnclaimed, runtimeExternallyManaged } = opts
  const pending: IngestOpsPending = isStopping ? 'stopping' : isStarting ? 'starting' : null
  const logicalText = buildIngestLogicalSummary(svc, status, processActive, pending)

  if (isStopping) {
    return {
      lamp: 'yellow',
      title: `Stopping ${svc.label}…`,
      logicalText,
    }
  }
  if (isStarting) {
    return {
      lamp: 'yellow',
      title: `Starting ${svc.label}…`,
      logicalText,
    }
  }

  const redisHealth = ingestRedisHealthLamp(svc.id, status, processActive)
  const staleLeaseGuard = hostUnclaimed && !runtimeExternallyManaged
  const lamp = staleLeaseGuard && redisHealth.lamp === 'green' ? 'red' : redisHealth.lamp
  const title =
    staleLeaseGuard && redisHealth.lamp === 'green'
      ? `${redisHealth.title} — Host lease unclaimed (no Dev/Prod Ops start). Redis health may be stale from a previous run.`
      : runtimeExternallyManaged && redisHealth.lamp === 'green'
        ? svc.platform_gateway_managed
          ? `${redisHealth.title} — Platform IB Gateway @ redis-ib (externally managed).`
          : `${redisHealth.title} — Managed by K8s Deployment (runtime_externally_managed).`
        : redisHealth.title

  return { lamp, title, logicalText }
}

/** Roll-up across all ingest rows using Redis health from Monitor /status. */
export function aggregateIngestRedisHealthLamp(
  services: MarketIngestServiceRow[],
  status: StatusResponse | null | undefined,
): { lamp: AggregateIngestLamp; title: string } {
  if (services.length === 0) {
    return { lamp: 'none', title: 'No ingest services in Ops configuration.' }
  }
  const tiers = services.map(s => ingestRedisHealthLamp(s.id, status).lamp)
  if (tiers.every(t => t === 'green')) {
    return { lamp: 'green', title: 'All ingest services report healthy Redis state (Monitor GET /status).' }
  }
  if (tiers.every(t => t === 'red')) {
    return { lamp: 'red', title: 'All ingest services report disconnected or unhealthy Redis state.' }
  }
  if (tiers.every(t => t === 'gray')) {
    return { lamp: 'gray', title: 'Redis health unknown for all ingest rows (/status missing or health not exposed).' }
  }
  if (tiers.every(t => t === 'yellow')) {
    return { lamp: 'yellow', title: 'All ingest services transitional.' }
  }
  return {
    lamp: 'yellow',
    title: 'Mixed Redis health: some services healthy, disconnected, or unknown. See each row tooltip.',
  }
}

/** Roll-up of systemd process state across all ingest rows. */
export function aggregateIngestServicesLamp(
  services: MarketIngestServiceRow[],
): { lamp: AggregateIngestLamp; title: string } {
  if (services.length === 0) {
    return { lamp: 'none', title: 'No ingest services in Ops configuration.' }
  }
  const tiers = services.map(s => ingestProcessLamp(s.process_active))
  if (tiers.every(t => t === 'green')) {
    return { lamp: 'green', title: 'All ingest services are active.' }
  }
  if (tiers.every(t => t === 'red')) {
    return { lamp: 'red', title: 'All ingest services are inactive or failed.' }
  }
  if (tiers.every(t => t === 'gray')) {
    return { lamp: 'gray', title: 'Process state unknown for all ingest services.' }
  }
  return { lamp: 'yellow', title: 'Mixed state: some services active, inactive, or unknown. See each row.' }
}

export const DAEMON_PAGE_SERVICE_IDS = ['trading_engine', 'account_sync_daemon'] as const

export function marketIngestServicesForDaemonAggregate(
  services: MarketIngestServiceRow[],
): MarketIngestServiceRow[] {
  return services.filter(s =>
    (DAEMON_PAGE_SERVICE_IDS as readonly string[]).includes(s.id),
  )
}

export function buildDaemonIngestRows(
  services: MarketIngestServiceRow[],
): { svc: MarketIngestServiceRow; category: IngestCategory }[] {
  return marketIngestServicesForDaemonAggregate(services).map(svc => ({
    svc,
    category: categoryForServiceId(svc.id),
  }))
}

/** Ingest rows used for Socket sidebar nav lamp (Monitor /status only). */
export const SOCKET_NAV_INGEST_IDS = [
  'massive_ws',
  'ib_ingestor',
  'ib_operator',
  'ib_account_agent',
] as const

export function minimalMarketIngestRowForId(id: string): MarketIngestServiceRow {
  return {
    id,
    label: '',
    systemd_unit: '',
    redis_meta_key: '',
    process_active: '',
  }
}

/** Worst-of roll-up when Ops service list is not loaded yet. */
export function aggregateDaemonProcessesHealthFromStatus(
  status: StatusResponse | null | undefined,
): { lamp: AggregateIngestLamp; title: string } {
  return aggregateIngestRedisHealthLamp(
    DAEMON_PAGE_SERVICE_IDS.map(id => minimalMarketIngestRowForId(id)),
    status,
  )
}

const SOCKET_NAV_SERVICE_LABELS: Record<(typeof SOCKET_NAV_INGEST_IDS)[number], string> = {
  massive_ws: 'Massive WS',
  ib_ingestor: 'Gateway · Market',
  ib_operator: 'Gateway · Operator',
  ib_account_agent: 'Gateway · Account',
}

function socketNavDegradedDetailTitle(
  services: MarketIngestServiceRow[],
  status: StatusResponse | null | undefined,
): string {
  const rows = services.map(s => ({
    id: s.id,
    ...ingestRedisHealthLamp(s.id, status),
  }))
  const degraded = rows.filter(r => r.lamp !== 'green')
  const greenN = rows.length - degraded.length
  if (degraded.length === 0) {
    return 'All ingest services report healthy Redis state (Monitor GET /status).'
  }
  const detail = degraded
    .map(r => {
      const name =
        SOCKET_NAV_SERVICE_LABELS[r.id as (typeof SOCKET_NAV_INGEST_IDS)[number]] ?? r.id
      return `${name}: ${r.title}`
    })
    .join(' · ')
  return `${detail} (${greenN}/${rows.length} ingest healthy — Socket edge health, not Celery workers)`
}

/** Sidebar Socket link: worst Redis health across edge ingest services. */
export function aggregateSocketNavHealthFromStatus(
  status: StatusResponse | null | undefined,
): { lamp: AggregateIngestLamp; title: string } {
  const pg = platformIbGatewayAggregateLamp(status)
  if (pg && isPlatformIbGatewayActive(status)) {
    const services = SOCKET_NAV_INGEST_IDS.map(id => minimalMarketIngestRowForId(id))
    const base = aggregateIngestRedisHealthLamp(services, status)
    if (base.lamp === 'green' && pg.lamp === 'green') {
      return {
        lamp: 'green',
        title: 'Platform IB Gateway + Massive WS healthy (Monitor GET /status @ redis-ib).',
      }
    }
    if (pg.lamp !== 'green') {
      return { lamp: pg.lamp, title: pg.title }
    }
  }
  const services = SOCKET_NAV_INGEST_IDS.map(id => minimalMarketIngestRowForId(id))
  const base = aggregateIngestRedisHealthLamp(services, status)
  if (base.lamp === 'green') {
    return base
  }
  return {
    lamp: base.lamp,
    title: socketNavDegradedDetailTitle(services, status),
  }
}
