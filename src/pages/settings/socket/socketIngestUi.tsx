import type { ReactNode } from 'react'
import { Play, Square, RotateCcw, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { MarketIngestAction } from '@/api/ops'
import {
  ingestRedisTruthyConnected,
  type MarketIngestServiceRow,
  type IngestLamp,
} from '@/utils/socketIngestLamp'
import {
  ingestActionBlockMessage,
  ingestActionButtonsForState,
  type IngestActionBlock,
} from '@/utils/ingestOpsShared'
import type { StatusResponse } from '@/types/monitor'
import { cn } from '@/lib/utils'

export const LAMP_BG: Record<IngestLamp | 'none', string> = {
  green: 'bg-lamp-green',
  yellow: 'bg-lamp-yellow',
  red: 'bg-lamp-red',
  gray: 'bg-lamp-gray',
  none: 'bg-lamp-gray',
}

export const PROCESS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  active: { variant: 'default', label: 'active' },
  activating: { variant: 'secondary', label: 'activating' },
  deactivating: { variant: 'secondary', label: 'deactivating' },
  reloading: { variant: 'secondary', label: 'reloading' },
  inactive: { variant: 'outline', label: 'inactive' },
  failed: { variant: 'destructive', label: 'failed' },
  dead: { variant: 'destructive', label: 'dead' },
}

export function IngestLampDot({ lamp, title }: { lamp: IngestLamp; title: string }) {
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full shrink-0', LAMP_BG[lamp])}
      title={title}
    />
  )
}

export function ProcessBadge({ active }: { active: string }) {
  const key = (active || '').toLowerCase().trim()
  const cfg = PROCESS_BADGE[key]
  if (cfg) {
    return <Badge variant={cfg.variant} className="text-xs font-mono">{cfg.label}</Badge>
  }
  return <Badge variant="outline" className="text-xs font-mono text-muted-foreground">{active || '—'}</Badge>
}

export function MassiveAgeBadge({ ageS }: { ageS: number }) {
  const isOk = ageS < 5
  const isWarn = ageS >= 5 && ageS < 30
  const cls = isOk
    ? 'bg-green-500/15 text-green-500 border-green-500/30'
    : isWarn
      ? 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'
      : 'bg-red-500/15 text-red-500 border-red-500/30'
  const label = ageS < 60 ? `${Math.floor(ageS)}s ago` : ageS < 3600 ? `${Math.floor(ageS / 60)}m ago` : `${Math.floor(ageS / 3600)}h ago`
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border', cls)}
      title={`Last Massive WS message ${label}. Green <5s, yellow <30s, red ≥30s.`}
    >
      {label}
    </span>
  )
}

export function ServiceHeartbeatBadge({ nextInS, overdue, critical }: {
  nextInS: number
  overdue?: boolean
  critical?: boolean
}) {
  const isSoon = !overdue && !critical && nextInS <= 2
  const cls = critical
    ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : overdue
      ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
      : isSoon
        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        : 'bg-slate-500/20 text-slate-300 border-slate-500/35'
  const label = critical
    ? `Overdue ${Math.floor(nextInS)}s`
    : overdue
      ? `Late ~${Math.ceil(nextInS)}s`
      : `~${Math.ceil(nextInS)}s`
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border min-w-[38px] justify-center', cls)}>
      {label}
    </span>
  )
}

export function StartingStoppingIndicator({ mode }: { mode: 'starting' | 'stopping' }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" aria-hidden />
      <span className="text-xs font-semibold text-yellow-400 capitalize">{mode}…</span>
    </div>
  )
}

export function IbProbeBadge({ nextInS, stale }: { nextInS: number; stale: boolean }) {
  const isSoon = !stale && nextInS <= 2
  const cls = stale
    ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : isSoon
      ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
      : 'bg-green-500/15 text-green-400 border-green-500/30'
  const label = stale ? 'Stale' : `~${Math.ceil(nextInS)}s`
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border', cls)}
      title={stale ? 'IB probe overdue' : `Next IB probe in ~${Math.ceil(nextInS)}s`}
    >
      {label}
    </span>
  )
}

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
  /** Unix seconds; updated once per second from parent (avoids Date.now during render). */
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
            const connDot = slot.connected === true
              ? 'bg-lamp-green'
              : slot.connected === false
                ? 'bg-lamp-red'
                : 'bg-lamp-gray'
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs flex-wrap">
                <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', connDot)} />
                {slot.label && (
                  <span className="text-muted-foreground w-7 shrink-0">{slot.label}</span>
                )}
                <span className="font-mono tabular-nums bg-muted/50 px-1.5 py-0.5 rounded">
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

export function ControlButtons({
  svc,
  actionBlock,
  redisLamp,
  isStarting,
  isStopping,
  onAction,
}: {
  svc: MarketIngestServiceRow
  actionBlock: IngestActionBlock
  redisLamp: IngestLamp
  isStarting?: boolean
  isStopping?: boolean
  onAction: (svc: MarketIngestServiceRow, action: MarketIngestAction) => void
}) {
  const rawButtons = ingestActionButtonsForState(svc.process_active)
  const showStart = isStarting ? false : isStopping ? false : redisLamp === 'green' ? false : rawButtons.showStart
  const showStop = isStarting ? true : isStopping ? false : redisLamp === 'green' ? true : rawButtons.showStop
  const blocked = actionBlock !== 'none'
  const blockMsg = ingestActionBlockMessage(actionBlock)
  const isIb = svc.id !== 'massive_ws'
  const blockedBySibling = actionBlock === 'remote_env' && !svc.redis_control_env

  if (blocked) {
    return (
      <span className="text-xs text-muted-foreground max-w-[220px]" title={blockedBySibling ? 'Peer service(s) held by other stack — stop them first.' : undefined}>
        {blockedBySibling
          ? 'Peer service(s) held by other stack — stop them first.'
          : blockMsg}
      </span>
    )
  }

  return (
    <div>
      {isStarting && <StartingStoppingIndicator mode="starting" />}
      {isStopping && <StartingStoppingIndicator mode="stopping" />}
      <div className="flex items-center gap-1 flex-wrap">
        {showStart && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 text-green-500 hover:text-green-400"
            title={`Start ${svc.label}`}
            onClick={() => onAction(svc, 'start')}
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        )}
        {showStop && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-400"
            title={`Stop ${svc.label}`}
            onClick={() => onAction(svc, 'stop')}
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          title={`Restart ${svc.label}`}
          onClick={() => onAction(svc, 'restart')}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        {isIb && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-orange-500 hover:text-orange-400"
            title={`Reset ${svc.label}`}
            onClick={() => onAction(svc, 'reset')}
          >
            <Zap className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

export interface SocketConfirmState {
  open: boolean
  title: string
  description: string
  svc: MarketIngestServiceRow | null
  action: MarketIngestAction | null
}

export const CLOSED_SOCKET_CONFIRM: SocketConfirmState = {
  open: false,
  title: '',
  description: '',
  svc: null,
  action: null,
}
