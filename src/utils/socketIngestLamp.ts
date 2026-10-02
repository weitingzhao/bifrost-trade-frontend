import {
  ibBrokerLogicalSummary,
  ibBrokerRedisHealthLamp,
  normalizeIbBrokerStatus,
  type IbBrokerServiceId,
} from '@/utils/ibBrokerConnectionModel'
import type { StatusResponse } from '@/types/monitor'
import { isPlatformIbGatewayActive, platformIbGatewayAggregateLamp } from '@/utils/platformIbGateway'

export type IngestLamp = 'green' | 'yellow' | 'red' | 'gray'
export type AggregateIngestLamp = IngestLamp | 'none'

export type IngestCategory = 'IB' | 'Engine' | 'Other'

export const INGEST_CATEGORY_LABELS: Record<IngestCategory, string> = {
  IB: 'Platform IB Gateway (redis-ib)',
  Engine: 'Strategy Trading',
  Other: 'Other',
}

export function categoryForServiceId(id: string): IngestCategory {
  if (id === 'ib_ingestor' || id === 'ib_market' || id === 'ib_operator' || id === 'ib_account_agent') {
    return 'IB'
  }
  if (id === 'trading_engine') return 'Engine'
  return 'Other'
}

export function buildUnifiedIngestRows(
  services: MarketIngestServiceRow[],
): { svc: MarketIngestServiceRow; category: IngestCategory }[] {
  const filtered = marketIngestServicesForSocketAggregate(services)
  const byCat: Record<IngestCategory, MarketIngestServiceRow[]> = {
    IB: [],
    Engine: [],
    Other: [],
  }
  for (const s of filtered) {
    byCat[categoryForServiceId(s.id)].push(s)
  }
  const out: { svc: MarketIngestServiceRow; category: IngestCategory }[] = []
  for (const s of byCat.IB) out.push({ svc: s, category: 'IB' })
  for (const s of byCat.Engine) out.push({ svc: s, category: 'Engine' })
  for (const s of byCat.Other) out.push({ svc: s, category: 'Other' })
  return out
}

function fmtAgeShort(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s)) return '—'
  if (s < 60) return `${Math.floor(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
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
  return null
}

export function buildIngestLogicalSummary(
  svc: MarketIngestServiceRow,
  status: StatusResponse | null | undefined,
  processActive?: string,
  pending: IngestOpsPending = null,
): string {
  if (pending === 'starting') {
    if (svc.id === 'trading_engine') {
      return 'Starting… waiting for daemon heartbeat and IB edge health'
    }
    const proc = (processActive || 'unknown').toLowerCase()
    return `Starting… (process ${proc})`
  }
  if (pending === 'stopping') {
    if (svc.id === 'trading_engine') {
      return 'Stopping… waiting for graceful shutdown and heartbeat to clear'
    }
    const proc = (processActive || 'unknown').toLowerCase()
    return `Stopping… (process ${proc})`
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
  if (svc.redis_meta_key) return `Meta: ${svc.redis_meta_key}`
  return '—'
}

export function ingestRowUsesConnectionColumn(_svc: MarketIngestServiceRow, category: IngestCategory): boolean {
  return category === 'IB'
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
  k8s_deployment?: string
  k8s_replicas?: number
  k8s_ready?: number
  k8s_scale_guard?: string | null
}

/**
 * Services included in the Socket aggregate lamp.
 * Excludes trading_engine (Daemon).
 */
export function marketIngestServicesForSocketAggregate(
  services: MarketIngestServiceRow[],
): MarketIngestServiceRow[] {
  return services.filter(s => s.id !== 'trading_engine')
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

export const DAEMON_PAGE_SERVICE_IDS = ['trading_engine'] as const

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
  return `${detail} (${greenN}/${rows.length} ingest healthy — Socket edge health)`
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
        title: 'Platform IB Gateway healthy (Monitor GET /status @ redis-ib).',
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
