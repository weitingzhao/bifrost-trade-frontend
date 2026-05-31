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
  fmtAge,
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
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border', cls)}
      title={`Last Massive WS message. Green <5s, yellow <30s, red ≥30s.`}
    >
      {fmtAge(ageS)}
    </span>
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

export function ConnectionCell({
  svc,
  status,
  elapsed,
}: {
  svc: MarketIngestServiceRow
  status: StatusResponse | null | undefined
  elapsed: number
}) {
  if (svc.id === 'massive_ws') {
    const ageS = status?.socket?.massive?.last_msg_age_s
    if (ageS == null) return <span className="text-xs text-muted-foreground">—</span>
    return <MassiveAgeBadge ageS={Math.max(0, ageS + elapsed)} />
  }

  const slots = buildIbSlots(svc.id, status)
  if (slots.length === 0) return <span className="text-xs text-muted-foreground">—</span>

  return (
    <div className="flex flex-col gap-1">
      {slots.map((slot, i) => {
        const nextInS = slot.nextProbeInS != null ? Math.max(0, slot.nextProbeInS - elapsed) : null
        const connDot = slot.connected === true
          ? 'bg-lamp-green'
          : slot.connected === false
            ? 'bg-lamp-red'
            : 'bg-lamp-gray'
        return (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', connDot)} />
            {slot.label && (
              <span className="text-muted-foreground w-7 shrink-0">{slot.label}</span>
            )}
            <span className="font-mono tabular-nums">
              {slot.clientId != null ? slot.clientId : '—'}
            </span>
            {nextInS != null && (
              <IbProbeBadge nextInS={nextInS} stale={slot.probeStale === true} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ControlButtons({
  svc,
  actionBlock,
  onAction,
}: {
  svc: MarketIngestServiceRow
  actionBlock: IngestActionBlock
  onAction: (svc: MarketIngestServiceRow, action: MarketIngestAction) => void
}) {
  const { showStart, showStop } = ingestActionButtonsForState(svc.process_active)
  const blocked = actionBlock !== 'none'
  const blockMsg = ingestActionBlockMessage(actionBlock)
  const isIb = svc.id !== 'massive_ws'

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {showStart && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 gap-1 text-xs"
          disabled={blocked}
          title={blocked ? blockMsg : `Start ${svc.label}`}
          onClick={() => onAction(svc, 'start')}
        >
          <Play className="h-3 w-3" />
          Start
        </Button>
      )}
      {showStop && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 gap-1 text-xs"
          disabled={blocked}
          title={blocked ? blockMsg : `Stop ${svc.label}`}
          onClick={() => onAction(svc, 'stop')}
        >
          <Square className="h-3 w-3" />
          Stop
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 gap-1 text-xs"
        disabled={blocked}
        title={blocked ? blockMsg : `Restart ${svc.label}`}
        onClick={() => onAction(svc, 'restart')}
      >
        <RotateCcw className="h-3 w-3" />
        Restart
      </Button>
      {isIb && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 gap-1 text-xs text-orange-500 hover:text-orange-400"
          disabled={blocked}
          title={blocked ? blockMsg : `Reset ${svc.label}`}
          onClick={() => onAction(svc, 'reset')}
        >
          <Zap className="h-3 w-3" />
          Reset
        </Button>
      )}
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
