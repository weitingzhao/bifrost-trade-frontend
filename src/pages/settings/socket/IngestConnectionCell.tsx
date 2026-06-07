import { cn } from '@/lib/utils'
import type { StatusResponse } from '@/types/monitor'
import { IbBrokerConnectionCell, ServiceHeartbeatBadge } from '@/components/socket/IbBrokerConnection'
import { ingestProcessRunningForIbClientId } from '@/components/socket/ibBrokerConnectionModel'
import {
  ingestRedisTruthyConnected,
  massiveServiceHeartbeatState,
  type MarketIngestServiceRow,
} from '@/utils/socketIngestLamp'
import {
  socketMassiveAgeBadgeClass,
  LAMP_BG,
} from './socketIngestUi'

function formatMassiveAgeLabel(ageS: number): string {
  if (ageS < 60) return `${Math.floor(ageS)}s`
  if (ageS < 3600) return `${Math.floor(ageS / 60)}m`
  return `${Math.floor(ageS / 3600)}h`
}

export function MassiveAgeBadge({
  ageS,
  wsConnected,
  heartbeatOk,
}: {
  ageS: number
  wsConnected: boolean
  heartbeatOk: boolean
}) {
  const label = formatMassiveAgeLabel(ageS)
  const title = wsConnected && heartbeatOk
    ? `Last Polygon quote ${label} ago (quiet market OK while service heartbeat is fresh).`
    : `Last Polygon quote ${label} ago. Green <5s, yellow <30s, red ≥30s when heartbeat is not OK.`
  return (
    <span className={socketMassiveAgeBadgeClass(ageS, { wsConnected, heartbeatOk })} title={title}>
      {label}
    </span>
  )
}

function ConnectionColumn({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: React.ReactNode
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

export function ConnectionCell({
  svc,
  status,
  elapsed,
  category,
  wallNowSec: _wallNowSec,
}: {
  svc: MarketIngestServiceRow
  status: StatusResponse | null | undefined
  elapsed: number
  category?: 'Massive' | 'IB' | 'Engine' | 'Other'
  wallNowSec: number
}) {
  if (svc.id === 'massive_ws') {
    const massive = status?.socket?.massive
    const wsConnected = massive?.ws_connected != null
      ? ingestRedisTruthyConnected(massive.ws_connected)
      : null
    const liveAgeS =
      massive?.last_msg_age_s != null
        ? Math.max(0, Math.floor(massive.last_msg_age_s + elapsed))
        : null
    const hb = massiveServiceHeartbeatState(massive, elapsed)
    const heartbeatOk = hb.ok
    const hbNext = hb.nextInS ?? hb.intervalSec

    return (
      <div className="flex items-start gap-3 text-xs">
        <ConnectionColumn
          label="WS"
          className="w-11 shrink-0"
          hint={
            wsConnected === true
              ? 'Polygon WebSocket connected'
              : wsConnected === false
                ? 'Polygon WebSocket disconnected'
                : 'WebSocket state unknown'
          }
        >
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              wsConnected === true
                ? LAMP_BG.green
                : wsConnected === false
                  ? LAMP_BG.red
                  : 'bg-muted-foreground/40',
            )}
            aria-hidden
          />
        </ConnectionColumn>
        <ConnectionColumn
          label="Msg"
          className="w-12"
          hint="Last Polygon quote age (not service liveness)"
        >
          {liveAgeS != null ? (
            <MassiveAgeBadge
              ageS={liveAgeS}
              wsConnected={wsConnected === true}
              heartbeatOk={heartbeatOk}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </ConnectionColumn>
        <ConnectionColumn
          label="HB"
          className="w-12"
          hint="Service heartbeat (Redis health hash refresh, ~30s)"
        >
          <ServiceHeartbeatBadge
            nextInS={hbNext}
            overdue={hb.overdue}
            critical={hb.critical}
          />
        </ConnectionColumn>
        {massive?.ws_reconnects != null && massive.ws_reconnects > 0 && (
          <span className="text-[10px] text-muted-foreground self-end pb-0.5" title="WebSocket reconnect count">
            ↻{massive.ws_reconnects}
          </span>
        )}
      </div>
    )
  }

  if (category === 'IB' && !ingestProcessRunningForIbClientId(svc.process_active)) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return <IbBrokerConnectionCell svc={svc} status={status} elapsed={elapsed} />
}
