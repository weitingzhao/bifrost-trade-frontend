import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { StatusResponse } from '@/types/monitor'
import type { MarketIngestServiceRow } from '@/utils/socketIngestLamp'
import {
  ibBrokerServiceHeartbeatNextS,
  ibBrokerServiceHeartbeatReconnectHint,
  ibBrokerSlotLamp,
  normalizeIbBrokerStatus,
  resolveIbBrokerSlots,
  type IbBrokerServiceId,
  type IbSlotView,
} from './ibBrokerConnectionModel'
import {
  ibBrokerClientIdClass,
  ibBrokerHeartbeatBadgeClass,
  ibBrokerProbeBadgeClass,
  ibBrokerSlotDotClass,
  LAMP_BG,
} from '@/pages/settings/socket/socketIngestUi'

function ConnectionColumn({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-0.5 min-w-0', className)} title={hint}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 leading-none">
        {label}
      </span>
      <div className="flex items-center gap-1 min-h-[1.125rem]">{children}</div>
    </div>
  )
}

export function IbProbeBadge({ nextInS, stale }: { nextInS: number; stale: boolean }) {
  const isSoon = !stale && nextInS <= 2
  const label = stale ? '!' : `~${Math.ceil(nextInS)}s`
  return (
    <span
      className={ibBrokerProbeBadgeClass(stale, isSoon)}
      title={stale ? 'IB probe overdue' : `Next IB probe in ~${Math.ceil(nextInS)}s`}
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
    ? `+${Math.floor(nextInS)}s`
    : overdue
      ? `~${Math.ceil(nextInS)}s`
      : `~${Math.ceil(nextInS)}s`
  return (
    <span className={ibBrokerHeartbeatBadgeClass({ overdue, critical, isSoon })}>
      {label}
    </span>
  )
}

function IbSlotColumn({ slot, elapsed }: { slot: IbSlotView; elapsed: number }) {
  const nextInS = slot.nextProbeInS != null ? Math.max(0, slot.nextProbeInS - elapsed) : null
  const probeBad = slot.probeUnhealthy === true
  const lamp = ibBrokerSlotLamp(slot)
  const connDot =
    lamp === 'green'
      ? ibBrokerSlotDotClass(true)
      : lamp === 'red'
        ? ibBrokerSlotDotClass(false)
        : LAMP_BG.gray
  const colTitle = slot.label
    ? `${slot.label} client ${slot.clientId ?? '—'}`
    : `Client ${slot.clientId ?? '—'}`
  const connHint =
    lamp === 'green'
      ? `${colTitle} — IB API connected (liveness OK)`
      : probeBad && slot.connected === true
        ? `${colTitle} — Redis connected but IB liveness probe stale or failed`
        : slot.connected === false
          ? `${colTitle} — IB API disconnected`
          : colTitle

  return (
    <ConnectionColumn label={slot.label ?? 'ID'} hint={connHint} className="shrink-0">
      <span className={cn('inline-block rounded-full shrink-0', connDot)} title={connHint} />
      <span className={cn(ibBrokerClientIdClass, 'py-0 px-1 text-[10px]')}>
        {slot.clientId != null ? slot.clientId : '—'}
      </span>
      {nextInS != null && (
        <IbProbeBadge nextInS={nextInS} stale={slot.probeStale === true || probeBad} />
      )}
      {probeBad && nextInS == null && <IbProbeBadge nextInS={0} stale />}
    </ConnectionColumn>
  )
}

function toBrokerServiceId(svcId: string): IbBrokerServiceId | null {
  if (svcId === 'ib_market') return 'ib_ingestor'
  if (svcId === 'ib_ingestor' || svcId === 'ib_account_agent' || svcId === 'ib_operator') {
    return svcId
  }
  return null
}

export function IbBrokerConnectionCell({
  svc,
  status,
  elapsed,
}: {
  svc: MarketIngestServiceRow
  status: StatusResponse | null | undefined
  elapsed: number
}) {
  const brokerId = toBrokerServiceId(svc.id)
  if (!brokerId) return <span className="text-xs text-muted-foreground">—</span>

  const view = normalizeIbBrokerStatus(brokerId, status)
  const cfg = status?.config?.ib_client?.port
  const slots = view ? resolveIbBrokerSlots(view, brokerId, cfg) : []
  const liveHeartbeatS = ibBrokerServiceHeartbeatNextS(brokerId, status, elapsed)
  const reconnectHint = ibBrokerServiceHeartbeatReconnectHint(brokerId, status)

  if (slots.length === 0 && liveHeartbeatS == null) {
    const hint = status
      ? 'Monitor /status has no socket block for this IB service.'
      : 'Monitor GET /status unavailable (check /api/monitor/status).'
    return (
      <span className="text-xs text-muted-foreground" title={hint}>
        {status ? '—' : 'No status'}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-start gap-3 text-xs">
        {liveHeartbeatS != null && (
          <ConnectionColumn
            label="HB"
            className="w-11 shrink-0"
            hint={
              reconnectHint
                ? `Service heartbeat — reconnecting: ${reconnectHint}`
                : 'Service heartbeat (~30s)'
            }
          >
            <ServiceHeartbeatBadge nextInS={liveHeartbeatS} />
          </ConnectionColumn>
        )}
        {slots.map((slot, i) => (
          <IbSlotColumn key={i} slot={slot} elapsed={elapsed} />
        ))}
      </div>
      {reconnectHint && (
        <span
          className="text-[10px] text-yellow-400 truncate max-w-[220px]"
          title="Reconnect in progress on current heartbeat tick"
        >
          ↻ {reconnectHint}
        </span>
      )}
    </div>
  )
}
