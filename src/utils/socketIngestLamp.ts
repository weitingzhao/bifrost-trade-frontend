import type { StatusResponse } from '@/types/monitor'

export type IngestLamp = 'green' | 'yellow' | 'red' | 'gray'
export type AggregateIngestLamp = IngestLamp | 'none'
export type LocalControlAgentLamp = 'green' | 'yellow' | 'red'

export type IngestCategory = 'Massive' | 'IB' | 'Engine' | 'Other'

export const INGEST_CATEGORY_LABELS: Record<IngestCategory, string> = {
  Massive: 'Massive Options WS',
  IB: 'IB Broker Services',
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

export function buildIngestLogicalSummary(
  svc: MarketIngestServiceRow,
  status: StatusResponse | null | undefined,
): string {
  const massive = status?.socket?.massive
  const ibIngestor = status?.socket?.ib_ingestor
  const ibAccountAgent = status?.socket?.ib_account_agent

  if (svc.id === 'massive_ws' && massive) {
    const ws = ingestRedisTruthyConnected(massive.ws_connected) ? 'connected' : 'disconnected'
    const rc = massive.ws_reconnects != null ? String(massive.ws_reconnects) : '—'
    return `WS ${ws}; last msg ${fmtAgeShort(massive.last_msg_age_s ?? null)}; reconnects ${rc}`
  }
  if ((svc.id === 'ib_ingestor' || svc.id === 'ib_market') && ibIngestor) {
    const c = ingestRedisTruthyConnected(ibIngestor.connected) ? 'connected' : 'disconnected'
    const rc = ibIngestor.reconnects != null ? String(ibIngestor.reconnects) : '—'
    const mc = ibIngestor.msg_count != null ? String(ibIngestor.msg_count) : '—'
    return `IB ${c}; last msg ${fmtAgeShort(ibIngestor.last_msg_age_s ?? null)}; reconnects ${rc}; msgs ${mc}`
  }
  if (svc.id === 'ib_account_agent' && ibAccountAgent) {
    const hostUp =
      ingestRedisTruthyConnected(ibAccountAgent.connected)
      || ingestRedisTruthyConnected(ibAccountAgent.host?.connected)
    const h = hostUp ? 'Host up' : 'Host down'
    const sec = ibAccountAgent.secondary
    const secBit =
      sec != null
        ? `; Sec ${ingestRedisTruthyConnected(sec.connected) ? 'up' : 'down'}`
        : ''
    const rc = ibAccountAgent.reconnects != null ? String(ibAccountAgent.reconnects) : '—'
    const mc = ibAccountAgent.msg_count != null ? String(ibAccountAgent.msg_count) : '—'
    return `${h}${secBit}; last msg ${fmtAgeShort(ibAccountAgent.last_msg_age_s ?? null)}; reconnects ${rc}; msgs ${mc}`
  }
  if (svc.id === 'ib_operator' && status?.socket?.ib_operator) {
    const op = status.socket.ib_operator
    const hostUp =
      ingestRedisTruthyConnected(op.connected)
      || ingestRedisTruthyConnected(op.host?.connected)
    const c = hostUp ? 'connected' : 'disconnected'
    const rc = op.reconnects != null ? String(op.reconnects) : '—'
    const mc = op.msg_count != null ? String(op.msg_count) : '—'
    return `IB Operator ${c}; last activity ${fmtAgeShort(op.last_msg_age_s ?? null)}; reconnects ${rc}; cmds ${mc}`
  }
  if (svc.id === 'trading_engine') {
    const hb = status?.daemon?.heartbeat
    if (hb?.daemon_alive && hb.last_ts != null) {
      return `Daemon alive; last heartbeat ${fmtAgeShort(Date.now() / 1000 - hb.last_ts)} ago`
    }
    if (hb?.graceful_shutdown_at != null) {
      return 'Graceful stop recorded (GET /status daemon.heartbeat)'
    }
    return 'Monitor /status heartbeat (not Redis ingest meta)'
  }
  if (svc.id === 'account_sync_daemon') {
    const hb = status?.account_sync_daemon?.heartbeat
    if (hb?.daemon_alive && hb.last_ts != null) {
      return `Alive; last sync heartbeat ${fmtAgeShort(Date.now() / 1000 - hb.last_ts)} ago`
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

function ingestRedisExplicitlyOff(v: unknown): boolean {
  if (v === false || v === 0) return true
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    return s === '0' || s === 'false' || s === 'no'
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

const IB_HEALTH_FRESH_MAX_S = 180

/**
 * Redis health lamp for a single ingest service, derived from Monitor GET /status socket.*.
 * Independent of Ops systemd state — Redis is shared across Dev/Prod stacks.
 */
export function ingestRedisHealthLamp(
  serviceId: string,
  status: StatusResponse | null | undefined,
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
    const msgAge =
      typeof m.last_msg_age_s === 'number' && Number.isFinite(m.last_msg_age_s)
        ? m.last_msg_age_s
        : null
    if (msgAge !== null && msgAge > 180) {
      return {
        lamp: 'red',
        title: `Massive WS health hash not updated for ${Math.floor(msgAge)}s — service likely crashed (bifrost:health:ws_massive_option).`,
      }
    }
    if (msgAge !== null && msgAge > 90) {
      return {
        lamp: 'yellow',
        title: `Massive WS health hash stale (${Math.floor(msgAge)}s) — service heartbeat not updating.`,
      }
    }
    if (ingestRedisTruthyConnected(m.ws_connected)) {
      return { lamp: 'green', title: 'Massive WS ingest healthy (Redis bifrost:health:ws_massive_option, connected).' }
    }
    return { lamp: 'red', title: 'Massive WS not connected (Redis bifrost:health:ws_massive_option).' }
  }

  if (id === 'ib_ingestor') {
    const ib = status.socket?.ib_ingestor
    if (ib == null) {
      return { lamp: 'gray', title: 'IB ingestor block missing from /status socket (Redis health unavailable).' }
    }
    if (ibSlotProbeUnhealthy(ib)) {
      return { lamp: 'red', title: 'IB ingestor IB liveness probe stale or failed (Redis bifrost:health:ws_ib_ingestor ib_probe_*).' }
    }
    if (ingestRedisTruthyConnected(ib.connected)) {
      return { lamp: 'green', title: 'IB ingestor healthy (Redis bifrost:health:ws_ib_ingestor, connected).' }
    }
    return { lamp: 'red', title: 'IB ingestor not connected (Redis bifrost:health:ws_ib_ingestor).' }
  }

  if (id === 'ib_account_agent') {
    const aa = status.socket?.ib_account_agent
    if (aa == null) {
      return { lamp: 'gray', title: 'IB Account Agent block missing from /status socket.' }
    }
    const hostSlotUp =
      ingestRedisTruthyConnected(aa.connected) || ingestRedisTruthyConnected(aa.host?.connected)
    const procDead =
      ingestRedisExplicitlyOff(aa.service_alive) || ingestRedisExplicitlyOff(aa.operator_alive)
    const hasAliveField =
      (aa.service_alive !== undefined && aa.service_alive !== null) ||
      (aa.operator_alive !== undefined && aa.operator_alive !== null)
    const serviceAlive = hasAliveField
      ? ingestRedisTruthyConnected(aa.service_alive) || ingestRedisTruthyConnected(aa.operator_alive)
      : true
    const secConfigured = aa.secondary !== undefined && aa.secondary !== null
    const secUp = ingestRedisTruthyConnected(aa.secondary?.connected)
    const lastAge = aa.last_msg_age_s
    const healthFresh =
      lastAge != null &&
      typeof lastAge === 'number' &&
      Number.isFinite(lastAge) &&
      lastAge <= IB_HEALTH_FRESH_MAX_S
    const hostUp = hostSlotUp && !procDead
    if (ibSlotProbeUnhealthy(aa.host)) {
      return { lamp: 'red', title: 'IB Account Agent Host IB probe stale or failed (Redis bifrost:health:ws_ib_account_agent host_ib_probe_*).' }
    }
    if (hostUp) {
      if (secConfigured && ibSlotProbeUnhealthy(aa.secondary)) {
        return { lamp: 'yellow', title: 'IB Account Agent Secondary IB probe stale or failed.' }
      }
      if (secConfigured && !secUp) {
        return { lamp: 'yellow', title: 'IB Account Agent Host connected; Secondary not connected.' }
      }
      return { lamp: 'green', title: 'IB Account Agent healthy (Host + Secondary if configured).' }
    }
    if (procDead) {
      return { lamp: 'red', title: 'IB Account Agent process reports stopped (Redis host_alive / service_alive).' }
    }
    if (serviceAlive && !hostSlotUp && healthFresh) {
      return { lamp: 'yellow', title: 'IB Account Agent running; IB Host not connected yet. Green when Host connects.' }
    }
    if (serviceAlive && !hostSlotUp && !healthFresh) {
      return { lamp: 'red', title: 'IB Account Agent Host not connected; Redis health stale or missing timestamp.' }
    }
    return { lamp: 'red', title: 'IB Account Agent Host not connected (Redis bifrost:health:ws_ib_account_agent).' }
  }

  if (id === 'ib_operator') {
    const mon = status.socket?.ib_operator
    if (mon == null) {
      return { lamp: 'gray', title: 'IB Operator health not in /status (socket.ib_operator missing).' }
    }
    const hostSlotUp =
      ingestRedisTruthyConnected(mon.connected) || ingestRedisTruthyConnected(mon.host?.connected)
    const procDead =
      ingestRedisExplicitlyOff(mon.service_alive) || ingestRedisExplicitlyOff(mon.operator_alive)
    const serviceAlive =
      ingestRedisTruthyConnected(mon.service_alive) || ingestRedisTruthyConnected(mon.operator_alive)
    const lastAge = mon.last_msg_age_s
    const healthFresh =
      lastAge != null &&
      typeof lastAge === 'number' &&
      Number.isFinite(lastAge) &&
      lastAge <= IB_HEALTH_FRESH_MAX_S
    const hostUp = hostSlotUp && !procDead
    if (ibSlotProbeUnhealthy(mon.host)) {
      return { lamp: 'red', title: 'IB Operator Host IB probe stale or failed (Redis bifrost:health:ws_ib_operator host_ib_probe_*).' }
    }
    if (hostUp) {
      if (mon.secondary != null && ibSlotProbeUnhealthy(mon.secondary)) {
        return { lamp: 'yellow', title: 'IB Operator Secondary IB probe stale or failed.' }
      }
      return { lamp: 'green', title: 'IB Operator healthy (Redis bifrost:health:ws_ib_operator).' }
    }
    if (procDead) {
      return { lamp: 'red', title: 'IB Operator process reports stopped (Redis host_alive / service_alive).' }
    }
    if (serviceAlive && !hostSlotUp && healthFresh) {
      return { lamp: 'yellow', title: 'IB Operator running; IB Host not connected yet. Green when Host connects.' }
    }
    if (serviceAlive && !hostSlotUp && !healthFresh) {
      return { lamp: 'red', title: 'IB Operator Host not connected; Redis health stale or missing timestamp.' }
    }
    return { lamp: 'red', title: 'IB Operator Host not connected (Redis bifrost:health:ws_ib_operator).' }
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

function minimalMarketIngestRowForId(id: string): MarketIngestServiceRow {
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
