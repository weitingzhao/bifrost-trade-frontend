import type {
  IbClientPort,
  SocketIbSlot,
  StatusResponse,
  StatusSocketIbBroker,
} from '@/types/monitor'
import type { IngestLamp } from '@/utils/socketIngestLamp'
import { ingestRedisTruthyConnected, ibSlotProbeUnhealthy } from '@/utils/socketIngestLamp'

export type IbBrokerServiceId = 'ib_ingestor' | 'ib_account_agent' | 'ib_operator'

export type IbBrokerStatusView = StatusSocketIbBroker

export interface IbSlotView {
  label?: string
  clientId: number | null
  connected: boolean | null
  probeAt?: number | null
  nextProbeInS?: number | null
  probeStale?: boolean
  probeUnhealthy?: boolean
}

const IB_HEALTH_FRESH_MAX_S = 180

function ingestRedisExplicitlyOff(v: unknown): boolean {
  if (v === false || v === 0) return true
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    return s === '0' || s === 'false' || s === 'no'
  }
  return false
}

function ingestProcessRunning(processActive: string | undefined): boolean {
  const a = (processActive || '').toLowerCase().trim()
  return a === 'active' || a === 'activating'
}

function fmtAgeShort(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s)) return '—'
  if (s < 60) return `${Math.floor(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

function slotFromIbSlot(
  slot: SocketIbSlot | null | undefined,
  fallbackConnected: boolean | null,
  label?: string,
): IbSlotView | null {
  if (!slot && fallbackConnected == null) return null
  const connected =
    slot?.connected !== undefined && slot?.connected !== null
      ? ingestRedisTruthyConnected(slot.connected)
      : fallbackConnected
  return {
    label,
    clientId: typeof slot?.client_id === 'number' ? slot.client_id : null,
    connected,
    probeAt: slot?.last_ib_probe_at ?? null,
    nextProbeInS: slot?.next_ib_probe_in_s ?? null,
    probeStale: slot?.ib_probe_stale === true,
    probeUnhealthy: ibSlotProbeUnhealthy(slot),
  }
}

function ingestorHostFromTopLevel(raw: StatusSocketIbBroker): SocketIbSlot {
  return {
    connected: raw.connected,
    client_id: raw.client_id ?? null,
    last_ib_probe_at: raw.last_ib_probe_at ?? null,
    ib_probe_interval_sec: raw.ib_probe_interval_sec ?? null,
    ib_probe_ok: raw.ib_probe_ok,
    next_ib_probe_in_s: raw.next_ib_probe_in_s ?? null,
    ib_probe_stale: raw.ib_probe_stale,
    reconnects: raw.reconnects ?? null,
  }
}

export function getIbBrokerSocketBlock(
  svcId: string,
  status: StatusResponse | null | undefined,
): IbBrokerStatusView | null {
  if (!status?.socket) return null
  const sid = svcId === 'ib_market' ? 'ib_ingestor' : svcId
  if (sid === 'ib_ingestor') return status.socket.ib_ingestor ?? null
  if (sid === 'ib_account_agent') return status.socket.ib_account_agent ?? null
  if (sid === 'ib_operator') return status.socket.ib_operator ?? null
  return null
}

/** Normalize ingestor top-level fields into host slot + optional secondary. */
export function normalizeIbBrokerStatus(
  svcId: IbBrokerServiceId,
  status: StatusResponse | null | undefined,
): IbBrokerStatusView | null {
  const raw = getIbBrokerSocketBlock(svcId, status)
  if (!raw) return null
  if (svcId === 'ib_ingestor') {
    const host = raw.host ?? ingestorHostFromTopLevel(raw)
    return { ...raw, host, secondary: null }
  }
  return raw
}

function secondaryConfigured(
  svcId: IbBrokerServiceId,
  view: IbBrokerStatusView,
  cfg?: IbClientPort,
): boolean {
  if (view.secondary != null) return true
  if (svcId === 'ib_account_agent') {
    return cfg?.account_agent_secondary != null
  }
  if (svcId === 'ib_operator') {
    return cfg?.operator_secondary != null
  }
  return false
}

export function resolveIbBrokerSlots(
  view: IbBrokerStatusView,
  svcId: IbBrokerServiceId,
  cfg?: IbClientPort,
): IbSlotView[] {
  const hostConnected =
    ingestRedisTruthyConnected(view.connected) || ingestRedisTruthyConnected(view.host?.connected)
  const hostId =
    view.host?.client_id ??
    view.client_id ??
    (svcId === 'ib_ingestor'
      ? cfg?.ingestor
      : svcId === 'ib_account_agent'
        ? cfg?.account_agent
        : cfg?.operator_host) ??
    null

  const slots: IbSlotView[] = []
  if (hostId != null || view.host) {
    const hostSlot = slotFromIbSlot(
      view.host,
      hostConnected,
      svcId === 'ib_ingestor' ? undefined : 'Host',
    )
    if (hostSlot) {
      if (hostSlot.clientId == null && typeof hostId === 'number') hostSlot.clientId = hostId
      slots.push(hostSlot)
    }
  }

  if (svcId === 'ib_ingestor') return slots

  if (secondaryConfigured(svcId, view, cfg)) {
    const secCfgId =
      svcId === 'ib_account_agent' ? cfg?.account_agent_secondary : cfg?.operator_secondary
    const secSlot = slotFromIbSlot(
      view.secondary ?? undefined,
      view.secondary ? ingestRedisTruthyConnected(view.secondary.connected) : null,
      'Sec',
    )
    if (secSlot) {
      if (secSlot.clientId == null && typeof secCfgId === 'number') secSlot.clientId = secCfgId
      slots.push(secSlot)
    }
  }

  return slots
}

/** Slot dot / column lamp: connected and probe healthy. */
export function ibBrokerSlotLamp(slot: IbSlotView): IngestLamp {
  if (slot.connected === true && !slot.probeUnhealthy) return 'green'
  if (slot.connected === true && slot.probeUnhealthy) return 'red'
  if (slot.connected === false) return 'red'
  return 'gray'
}

function ibProbeStaleSummaryParts(
  host: SocketIbSlot | null | undefined,
  secondary?: SocketIbSlot | null,
): string[] {
  const parts: string[] = []
  if (ibSlotProbeUnhealthy(host)) parts.push('Host probe stale')
  if (secondary != null && ibSlotProbeUnhealthy(secondary)) parts.push('Sec probe stale')
  return parts
}

export function ibBrokerLogicalSummary(
  svcId: IbBrokerServiceId,
  view: IbBrokerStatusView,
): string {
  const hostUp =
    ingestRedisTruthyConnected(view.connected) || ingestRedisTruthyConnected(view.host?.connected)
  const hostBit = hostUp ? 'Host up' : 'Host down'
  const sec = view.secondary
  const secBit =
    sec != null ? `; Sec ${ingestRedisTruthyConnected(sec.connected) ? 'up' : 'down'}` : ''
  const probeParts = ibProbeStaleSummaryParts(view.host, view.secondary)
  const probeNote = probeParts.length ? `; ${probeParts.join('; ')}` : ''
  const rc = view.reconnects != null ? String(view.reconnects) : '—'
  const mc = view.msg_count != null ? String(view.msg_count) : '—'
  const ageLabel = svcId === 'ib_operator' ? 'last activity' : 'last msg'

  if (svcId === 'ib_ingestor') {
    const c = hostUp ? 'connected' : 'disconnected'
    const ingestProbe = ibSlotProbeUnhealthy(view.host) ? '; probe stale' : ''
    return `IB ${c}${ingestProbe}; ${ageLabel} ${fmtAgeShort(view.last_msg_age_s ?? null)}; reconnects ${rc}; msgs ${mc}`
  }

  const prefix = svcId === 'ib_operator' ? 'IB Operator' : 'IB Account Agent'
  const activity = `${hostBit}${secBit}`
  const countLabel = svcId === 'ib_operator' ? 'cmds' : 'msgs'
  return `${prefix} ${activity}${probeNote}; ${ageLabel} ${fmtAgeShort(view.last_msg_age_s ?? null)}; reconnects ${rc}; ${countLabel} ${mc}`
}

export function ibBrokerRedisHealthLamp(
  svcId: IbBrokerServiceId,
  status: StatusResponse | null | undefined,
  processActive?: string,
): { lamp: IngestLamp; title: string } {
  const view = normalizeIbBrokerStatus(svcId, status)
  const redisKey =
    svcId === 'ib_ingestor'
      ? 'bifrost:health:ws_ib_ingestor'
      : svcId === 'ib_account_agent'
        ? 'bifrost:health:ws_ib_account_agent'
        : 'bifrost:health:ws_ib_operator'
  const label =
    svcId === 'ib_ingestor'
      ? 'IB ingestor'
      : svcId === 'ib_account_agent'
        ? 'IB Account Agent'
        : 'IB Operator'

  if (!status || !view) {
    return { lamp: 'gray', title: `${label} block missing from /status socket.` }
  }

  const hostSlotUp =
    ingestRedisTruthyConnected(view.connected) || ingestRedisTruthyConnected(view.host?.connected)
  const procDead =
    ingestRedisExplicitlyOff(view.service_alive) || ingestRedisExplicitlyOff(view.operator_alive)
  const hasAliveField =
    (view.service_alive !== undefined && view.service_alive !== null) ||
    (view.operator_alive !== undefined && view.operator_alive !== null)
  const serviceAlive = hasAliveField
    ? ingestRedisTruthyConnected(view.service_alive) || ingestRedisTruthyConnected(view.operator_alive)
    : svcId === 'ib_ingestor'
      ? true
      : true
  const secConfigured = view.secondary != null
  const secUp = ingestRedisTruthyConnected(view.secondary?.connected)
  const lastAge = view.last_msg_age_s
  const healthFresh =
    lastAge != null && typeof lastAge === 'number' && Number.isFinite(lastAge) && lastAge <= IB_HEALTH_FRESH_MAX_S
  const hostUp = hostSlotUp && !procDead

  if (ibSlotProbeUnhealthy(view.host)) {
    return {
      lamp: 'red',
      title: `${label} Host IB probe stale or failed (Redis ${redisKey} host_ib_probe_*).`,
    }
  }
  if (hostUp) {
    if (secConfigured && ibSlotProbeUnhealthy(view.secondary)) {
      return { lamp: 'yellow', title: `${label} Secondary IB probe stale or failed.` }
    }
    if (secConfigured && !secUp) {
      return { lamp: 'yellow', title: `${label} Host connected; Secondary not connected.` }
    }
    return { lamp: 'green', title: `${label} healthy (Redis ${redisKey}).` }
  }
  if (procDead) {
    return { lamp: 'red', title: `${label} process reports stopped (Redis host_alive / service_alive).` }
  }
  if (serviceAlive && !hostSlotUp && healthFresh) {
    return {
      lamp: 'yellow',
      title: `${label} running; IB Host not connected yet. Green when Host connects.`,
    }
  }
  if (serviceAlive && !hostSlotUp && !healthFresh) {
    return {
      lamp: 'red',
      title: `${label} Host not connected; Redis health stale or missing timestamp.`,
    }
  }
  if (svcId === 'ib_ingestor' && ingestProcessRunning(processActive) && !hostSlotUp) {
    return { lamp: 'red', title: `${label} not connected (Redis ${redisKey}).` }
  }
  return { lamp: 'red', title: `${label} Host not connected (Redis ${redisKey}).` }
}

export function ibBrokerServiceHeartbeatNextS(
  svcId: IbBrokerServiceId,
  status: StatusResponse | null | undefined,
  elapsed: number,
): number | null {
  const view = normalizeIbBrokerStatus(svcId, status)
  const raw = view?.next_service_heartbeat_in_s
  if (raw == null || !Number.isFinite(Number(raw))) return null
  return Math.max(0, Number(raw) - elapsed)
}

export function ibBrokerServiceHeartbeatReconnectHint(
  svcId: IbBrokerServiceId,
  status: StatusResponse | null | undefined,
): string | null {
  const view = normalizeIbBrokerStatus(svcId, status)
  const raw = view?.service_heartbeat_reconnect_in_progress
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  return t !== '' ? t : null
}

export function ingestProcessRunningForIbClientId(processActive: string): boolean {
  const a = (processActive || '').toLowerCase().trim()
  return a === 'active' || a === 'activating' || a === 'reloading'
}
