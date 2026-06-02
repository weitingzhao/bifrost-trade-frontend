import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { StatusResponse } from '@/types/monitor'
import {
  ingestRedisTruthyConnected,
  type MarketIngestServiceRow,
} from '@/utils/socketIngestLamp'
import {
  socketIbClientIdClass,
  socketIbProbeBadgeClass,
  socketMassiveAgeBadgeClass,
  socketServiceHeartbeatBadgeClass,
  LAMP_BG,
} from './socketIngestUi'

interface IbSlotDisplay {
  label?: string
  clientId: number | null
  connected: boolean | null
  probeAt?: number | null
  nextProbeInS?: number | null
  probeStale?: boolean
}

export function buildIbSlots(svcId: string, status: StatusResponse | null | undefined): IbSlotDisplay[] {
  if (!status) return []
  const cfg = status.config?.ib_client

  if (svcId === 'ib_ingestor') {
    const ib = status.socket?.ib_ingestor
    const id = ib?.client_id ?? cfg?.port?.ingestor ?? null
    if (id == null) return []
    return [{
      clientId: typeof id === 'number' ? id : null,
      connected: ib ? ingestRedisTruthyConnected(ib.connected) : null,
      probeAt: ib?.last_ib_probe_at,
      nextProbeInS: ib?.next_ib_probe_in_s ?? null,
      probeStale: ib?.ib_probe_stale === true,
    }]
  }

  if (svcId === 'ib_account_agent') {
    const aa = status.socket?.ib_account_agent
    const slots: IbSlotDisplay[] = []
    const hostId = aa?.host?.client_id ?? aa?.client_id ?? cfg?.port?.account_agent ?? null
    const hostLive = ingestRedisTruthyConnected(aa?.connected) || ingestRedisTruthyConnected(aa?.host?.connected)
    if (hostId != null) {
      slots.push({
        label: 'Host',
        clientId: typeof hostId === 'number' ? hostId : null,
        connected: hostLive,
        probeAt: aa?.host?.last_ib_probe_at,
        nextProbeInS: aa?.host?.next_ib_probe_in_s ?? null,
        probeStale: aa?.host?.ib_probe_stale === true,
      })
    }
    const secPresent = aa?.secondary !== undefined && aa.secondary !== null
    const secCfg = cfg?.port?.account_agent_secondary
    if (secPresent || secCfg != null) {
      const secId = aa?.secondary?.client_id ?? secCfg ?? null
      const secLive = ingestRedisTruthyConnected(aa?.secondary?.connected)
      slots.push({
        label: 'Sec',
        clientId: typeof secId === 'number' ? secId : null,
        connected: secLive && hostLive,
        probeAt: aa?.secondary?.last_ib_probe_at,
        nextProbeInS: aa?.secondary?.next_ib_probe_in_s ?? null,
        probeStale: aa?.secondary?.ib_probe_stale === true,
      })
    }
    return slots
  }

  if (svcId === 'ib_operator') {
    const op = status.socket?.ib_operator
    const slots: IbSlotDisplay[] = []
    const hostId = op?.host?.client_id ?? cfg?.port?.operator_host ?? null
    const hostLive = ingestRedisTruthyConnected(op?.connected) || ingestRedisTruthyConnected(op?.host?.connected)
    if (hostId != null) {
      slots.push({
        label: 'Host',
        clientId: typeof hostId === 'number' ? hostId : null,
        connected: hostLive,
        probeAt: op?.host?.last_ib_probe_at,
        nextProbeInS: op?.host?.next_ib_probe_in_s ?? null,
        probeStale: op?.host?.ib_probe_stale === true,
      })
    }
    const secPresent = op?.secondary !== undefined
    const secCfg = cfg?.port?.operator_secondary
    if (secPresent || secCfg != null) {
      const secId = op?.secondary?.client_id ?? secCfg ?? null
      const secLive = ingestRedisTruthyConnected(op?.secondary?.connected)
      slots.push({
        label: 'Sec',
        clientId: typeof secId === 'number' ? secId : null,
        connected: secLive && hostLive,
        probeAt: op?.secondary?.last_ib_probe_at,
        nextProbeInS: op?.secondary?.next_ib_probe_in_s ?? null,
        probeStale: op?.secondary?.ib_probe_stale === true,
      })
    }
    return slots
  }

  return []
}

function serviceHeartbeatLiveNextS(
  svcId: string,
  status: StatusResponse | null | undefined,
  elapsed: number,
): number | null {
  const sid = svcId === 'ib_market' ? 'ib_ingestor' : svcId
  const raw =
    sid === 'ib_ingestor'
      ? status?.socket?.ib_ingestor?.next_service_heartbeat_in_s
      : sid === 'ib_account_agent'
        ? status?.socket?.ib_account_agent?.next_service_heartbeat_in_s
        : sid === 'ib_operator'
          ? status?.socket?.ib_operator?.next_service_heartbeat_in_s
          : null
  if (raw == null || !Number.isFinite(Number(raw))) return null
  return Math.max(0, Number(raw) - elapsed)
}

function serviceHeartbeatReconnectHint(
  svcId: string,
  status: StatusResponse | null | undefined,
): string | null {
  const sid = svcId === 'ib_market' ? 'ib_ingestor' : svcId
  let raw: string | null | undefined
  if (sid === 'ib_ingestor') raw = status?.socket?.ib_ingestor?.service_heartbeat_reconnect_in_progress
  else if (sid === 'ib_account_agent') raw = status?.socket?.ib_account_agent?.service_heartbeat_reconnect_in_progress
  else if (sid === 'ib_operator') raw = status?.socket?.ib_operator?.service_heartbeat_reconnect_in_progress
  else return null
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  return t !== '' ? t : null
}

function ingestProcessRunningForIbClientId(processActive: string): boolean {
  const a = (processActive || '').toLowerCase().trim()
  return a === 'active' || a === 'activating' || a === 'reloading'
}

function formatMassiveAgeLabel(ageS: number): string {
  if (ageS < 60) return `${Math.floor(ageS)}s ago`
  if (ageS < 3600) return `${Math.floor(ageS / 60)}m ago`
  return `${Math.floor(ageS / 3600)}h ago`
}

export function MassiveAgeBadge({ ageS }: { ageS: number }) {
  const label = formatMassiveAgeLabel(ageS)
  return (
    <span
      className={socketMassiveAgeBadgeClass(ageS)}
      title={`Last Massive WS message ${label}. Green <5s, yellow <30s, red ≥30s.`}
    >
      {label}
    </span>
  )
}

export function ServiceHeartbeatBadge({
  nextInS,
  overdue,
  critical,
}: {
  nextInS: number
  overdue?: boolean
  critical?: boolean
}) {
  const isSoon = !overdue && !critical && nextInS <= 2
  const label = critical
    ? `Overdue ${Math.floor(nextInS)}s`
    : overdue
      ? `Late ~${Math.ceil(nextInS)}s`
      : `~${Math.ceil(nextInS)}s`
  return (
    <span className={socketServiceHeartbeatBadgeClass({ overdue, critical, isSoon })}>
      {label}
    </span>
  )
}

export function IbProbeBadge({ nextInS, stale }: { nextInS: number; stale: boolean }) {
  const isSoon = !stale && nextInS <= 2
  const label = stale ? 'Stale' : `~${Math.ceil(nextInS)}s`
  return (
    <span
      className={socketIbProbeBadgeClass(stale, isSoon)}
      title={stale ? 'IB probe overdue' : `Next IB probe in ~${Math.ceil(nextInS)}s`}
    >
      {label}
    </span>
  )
}

export function ConnectionCell({
  svc,
  status,
  elapsed,
  category,
  wallNowSec,
}: {
  svc: MarketIngestServiceRow
  status: StatusResponse | null | undefined
  elapsed: number
  category?: 'Massive' | 'IB' | 'Engine' | 'Other'
  wallNowSec: number
}) {
  if (svc.id === 'massive_ws') {
    const massive = status?.socket?.massive
    const liveAgeS =
      massive?.last_msg_age_s != null
        ? Math.max(0, Math.floor(massive.last_msg_age_s + elapsed))
        : null
    const updAt = svc.redis_control_updated_at
    let heartbeatEl: ReactNode = null
    if (updAt != null && Number.isFinite(updAt) && updAt > 0) {
      const HEARTBEAT_PERIOD = 30
      const leaseAgeS = Math.max(0, wallNowSec - updAt)
      const nextInS = Math.max(0, HEARTBEAT_PERIOD - leaseAgeS)
      const overdue = leaseAgeS > HEARTBEAT_PERIOD + 10
      const critical = leaseAgeS > 120
      heartbeatEl = (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs text-muted-foreground">Service heartbeat</span>
          <ServiceHeartbeatBadge nextInS={critical ? leaseAgeS : nextInS} overdue={overdue} critical={critical} />
        </div>
      )
    }
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Last msg</span>
          {liveAgeS != null ? <MassiveAgeBadge ageS={liveAgeS} /> : <span className="text-xs text-muted-foreground">—</span>}
          {massive?.ws_reconnects != null && massive.ws_reconnects > 0 && (
            <span className="text-xs text-muted-foreground">· {massive.ws_reconnects} reconnects</span>
          )}
        </div>
        {heartbeatEl}
      </div>
    )
  }

  if (category === 'IB' && !ingestProcessRunningForIbClientId(svc.process_active)) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const slots = buildIbSlots(svc.id, status)
  const liveHeartbeatS = category === 'IB' ? serviceHeartbeatLiveNextS(svc.id, status, elapsed) : null
  const reconnectHint = category === 'IB' ? serviceHeartbeatReconnectHint(svc.id, status) : null

  if (slots.length === 0 && liveHeartbeatS == null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {liveHeartbeatS != null && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Service heartbeat</span>
          <ServiceHeartbeatBadge nextInS={liveHeartbeatS} />
          {reconnectHint && (
            <span className="text-xs text-yellow-400" title="Reconnect in progress on current heartbeat tick">
              {reconnectHint}
            </span>
          )}
        </div>
      )}
      {slots.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">IB Client ID</span>
          {slots.map((slot, i) => {
            const nextInS = slot.nextProbeInS != null ? Math.max(0, slot.nextProbeInS - elapsed) : null
            const connDot =
              slot.connected === true
                ? LAMP_BG.green
                : slot.connected === false
                  ? LAMP_BG.red
                  : LAMP_BG.gray
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs flex-wrap">
                <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', connDot)} />
                {slot.label && (
                  <span className="text-muted-foreground w-7 shrink-0">{slot.label}</span>
                )}
                <span className={socketIbClientIdClass}>
                  {slot.clientId != null ? slot.clientId : '—'}
                </span>
                {nextInS != null && (
                  <IbProbeBadge nextInS={nextInS} stale={slot.probeStale === true} />
                )}
                {slot.probeStale && nextInS == null && (
                  <IbProbeBadge nextInS={0} stale />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
