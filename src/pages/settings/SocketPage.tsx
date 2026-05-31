import { useState, useEffect, useCallback } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw, Eye, EyeOff, Play, Square, RotateCcw, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { StatusLamp } from '@/components/StatusLamp'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import {
  useMarketIngestServices,
  useOpsHealth,
  useOpsCapabilities,
  useControlMarketIngest,
  useClearConflictLeases,
} from '@/hooks/useSocketServices'
import { getOpsToken, setOpsToken, type MarketIngestAction } from '@/api/ops'
import {
  ingestRedisHealthLamp,
  ingestProcessLamp,
  ibSlotProbeUnhealthy,
  ingestRedisTruthyConnected,
  marketIngestServicesForSocketAggregate,
  type MarketIngestServiceRow,
  type IngestLamp,
} from '@/utils/socketIngestLamp'
import {
  resolveEffectiveRedisControlEnv,
  ingestActionBlock,
  ingestActionBlockMessage,
  normalizedPageDevProd,
  fmtTimestamp,
  fmtAge,
  hasStackConflict,
  ingestActionButtonsForState,
  type IngestActionBlock,
} from '@/utils/ingestOpsShared'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { StatusResponse } from '@/types/monitor'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const LAMP_BG: Record<IngestLamp | 'none', string> = {
  green:  'bg-lamp-green',
  yellow: 'bg-lamp-yellow',
  red:    'bg-lamp-red',
  gray:   'bg-lamp-gray',
  none:   'bg-lamp-gray',
}

const PROCESS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  active:       { variant: 'default',     label: 'active'       },
  activating:   { variant: 'secondary',   label: 'activating'   },
  deactivating: { variant: 'secondary',   label: 'deactivating' },
  reloading:    { variant: 'secondary',   label: 'reloading'    },
  inactive:     { variant: 'outline',     label: 'inactive'     },
  failed:       { variant: 'destructive', label: 'failed'       },
  dead:         { variant: 'destructive', label: 'dead'         },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IngestLampDot({ lamp, title }: { lamp: IngestLamp; title: string }) {
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full shrink-0', LAMP_BG[lamp])}
      title={title}
    />
  )
}

function ProcessBadge({ active }: { active: string }) {
  const key = (active || '').toLowerCase().trim()
  const cfg = PROCESS_BADGE[key]
  if (cfg) {
    return <Badge variant={cfg.variant} className="text-xs font-mono">{cfg.label}</Badge>
  }
  return <Badge variant="outline" className="text-xs font-mono text-muted-foreground">{active || '—'}</Badge>
}

function MassiveAgeBadge({ ageS }: { ageS: number }) {
  const isOk   = ageS < 5
  const isWarn = ageS >= 5 && ageS < 30
  const cls = isOk
    ? 'bg-green-500/15 text-green-500 border-green-500/30'
    : isWarn
    ? 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'
    : 'bg-red-500/15 text-red-500 border-red-500/30'
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border', cls)}
      title={`Last Massive WS message ${fmtAge(ageS)}. Green <5s, yellow <30s, red ≥30s.`}
    >
      {fmtAge(ageS)}
    </span>
  )
}

function IbProbeBadge({ nextInS, stale }: { nextInS: number; stale: boolean }) {
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
      title={stale ? 'IB probe overdue — ib_probe_stale=true in Monitor /status.' : `Next IB liveness probe in ~${Math.ceil(nextInS)}s.`}
    >
      {label}
    </span>
  )
}

// ── IB Client slot cell ───────────────────────────────────────────────────────

interface IbSlotDisplay {
  label?: string
  clientId: number | null
  connected: boolean | null
  probeAt?: number | null
  nextProbeInS?: number | null
  probeStale?: boolean
}

function buildIbSlots(svcId: string, status: StatusResponse | null | undefined): IbSlotDisplay[] {
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

function ConnectionCell({
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

// ── Control buttons ───────────────────────────────────────────────────────────

function ControlButtons({
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
          title={blocked ? blockMsg : `Reset ${svc.label} — releases IB client connections then restarts`}
          onClick={() => onAction(svc, 'reset')}
        >
          <Zap className="h-3 w-3" />
          Reset
        </Button>
      )}
    </div>
  )
}

// ── Control confirmation dialog ───────────────────────────────────────────────

interface ConfirmState {
  open: boolean
  title: string
  description: string
  svc: MarketIngestServiceRow | null
  action: MarketIngestAction | null
}

const CLOSED_CONFIRM: ConfirmState = {
  open: false, title: '', description: '', svc: null, action: null,
}

// ── Token panel ───────────────────────────────────────────────────────────────

function TokenPanel({ token, onTokenChange }: { token: string; onTokenChange: (t: string) => void }) {
  const [show, setShow] = useState(false)
  const [draft, setDraft] = useState(token)

  function save() {
    setOpsToken(draft.trim())
    onTokenChange(draft.trim())
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Ops token</span>
      <div className="flex items-center gap-1">
        <input
          type={show ? 'text' : 'password'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="Bearer token for control actions"
          className="h-7 rounded border border-border bg-background px-2 text-xs font-mono w-52 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShow(!show)} title={show ? 'Hide token' : 'Show token'}>
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={save}>
          Apply
        </Button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SocketPage() {
  const [token, setToken] = useState<string>(() => getOpsToken())
  const [elapsed, setElapsed] = useState(0)
  const [confirm, setConfirm] = useState<ConfirmState>(CLOSED_CONFIRM)
  const [actionError, setActionError] = useState<string | null>(null)

  const qc = useQueryClient()

  // Tick once per second to drive probe countdown badges
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1_000)
    return () => clearInterval(id)
  }, [])

  const { data: statusData, isLoading: statusLoading } = useMonitorStatus()

  // Reset elapsed when Monitor /status refreshes so countdown stays in sync with server data
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setElapsed(0)
  }, [statusData])

  const { data: ingestData, isLoading: ingestLoading, isError: ingestError } =
    useMarketIngestServices(token)
  const { data: opsHealth } = useOpsHealth(token)
  const { data: caps } = useOpsCapabilities(token)

  const controlMutation = useControlMarketIngest(token)
  const clearLeasesMutation = useClearConflictLeases(token)

  const services: MarketIngestServiceRow[] = ingestData?.services ?? []
  const socketServices = marketIngestServicesForSocketAggregate(services)

  const canOperate = caps?.capabilities?.can_operate === true
  const disableScript =
    opsHealth?.local_control === 'subprocess' && opsHealth.market_ingest_script_control !== true
  const pageEnv = normalizedPageDevProd(opsHealth?.config_profile ?? null)
  const conflict = hasStackConflict(socketServices)

  const status = statusData ?? null

  function handleTokenChange(t: string) {
    setToken(t)
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.ingestServices })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.opsHealth })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.capabilities })
  }

  function openConfirm(svc: MarketIngestServiceRow, action: MarketIngestAction) {
    const actionLabels: Record<MarketIngestAction, string> = {
      start: 'Start',
      stop: 'Stop',
      restart: 'Restart',
      reset: 'Reset (release IB connections + restart)',
    }
    setActionError(null)
    setConfirm({
      open: true,
      title: `${actionLabels[action]} ${svc.label}`,
      description: action === 'reset'
        ? `This will release all IB client connections for ${svc.label} then restart the service. Continue?`
        : `${actionLabels[action]} the "${svc.label}" service via Ops API. This may take up to 120s.`,
      svc,
      action,
    })
  }

  async function executeConfirmed() {
    if (!confirm.svc || !confirm.action) return
    setActionError(null)
    try {
      await controlMutation.mutateAsync({ serviceId: confirm.svc.id, action: confirm.action })
      setConfirm(CLOSED_CONFIRM)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Control request failed.')
    }
  }

  const refreshAll = useCallback(() => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.ingestServices })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.opsHealth })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.capabilities })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
  }, [qc])

  // ── Ops environment info ──────────────────────────────────────────────────

  const configProfileBadge =
    opsHealth?.config_profile === 'dev' || opsHealth?.config_profile === 'development' ? (
      <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-500 text-xs">Dev</Badge>
    ) : opsHealth?.config_profile === 'prod' || opsHealth?.config_profile === 'production' ? (
      <Badge variant="outline" className="border-green-600/40 bg-green-600/10 text-green-600 text-xs">Prod</Badge>
    ) : opsHealth ? (
      <Badge variant="outline" className="text-xs text-muted-foreground">Custom</Badge>
    ) : null

  const agentStatus =
    opsHealth?.executor_mode === 'agent' ? (
      <span className={cn('text-xs', opsHealth.agent_reachable ? 'text-green-500' : 'text-red-500')}>
        {opsHealth.agent_reachable ? 'Agent reachable' : 'Agent unreachable'}
        {opsHealth.agent_error ? ` — ${opsHealth.agent_error}` : ''}
      </span>
    ) : opsHealth?.executor_mode === 'subprocess' ? (
      <span className="text-xs text-muted-foreground">
        Subprocess {opsHealth.market_ingest_script_control ? '(script control)' : '(no script control)'}
      </span>
    ) : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageShell className="space-y-5">
      <PageHeader
        title="Socket Services"
        titleSize="large"
        description="Market ingest · IB connections · Redis health · auto-refresh every 15 s"
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll} className="gap-1.5 shrink-0">
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </Button>
        }
      />

      {/* Ops Environment + Token */}
      <Card>
        <CardContent className="pt-4 pb-4 px-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">Ops Environment</span>
              {configProfileBadge}
              {opsHealth?.executor_mode && (
                <span className="text-xs text-muted-foreground">
                  executor: <span className="font-mono">{opsHealth.executor_mode}</span>
                </span>
              )}
              {agentStatus}
              {caps && (
                <span className={cn('text-xs', caps.capabilities?.can_operate ? 'text-green-500' : 'text-muted-foreground')}>
                  {caps.capabilities?.can_operate ? '✓ can operate' : '✗ no operate permission'}
                </span>
              )}
            </div>
            <TokenPanel token={token} onTokenChange={handleTokenChange} />
          </div>
          {opsHealth?.config_profile && (
            <p className="text-xs text-muted-foreground">
              Config profile: <span className="font-mono">{opsHealth.config_profile}</span>
              {pageEnv && ` · controls only apply to ${pageEnv} stack`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Conflict banner */}
      {conflict && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-orange-500">Dev/Prod stack conflict detected</p>
            <p className="text-xs text-muted-foreground">
              Both dev and prod Ops stacks have active Redis control leases on IB services.
              Stop processes on one stack first, or clear the conflict leases below.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-xs border-orange-500/40 text-orange-500 hover:bg-orange-500/10"
            disabled={!canOperate || clearLeasesMutation.isPending}
            onClick={() => clearLeasesMutation.mutate()}
          >
            {clearLeasesMutation.isPending ? 'Clearing…' : 'Clear Leases'}
          </Button>
        </div>
      )}

      {/* Services table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">Ingest Services</CardTitle>
        </CardHeader>
        <CardContent className="pt-3 px-0">
          {ingestLoading && (
            <p className="text-sm text-muted-foreground px-4 py-4">Loading services from Ops API…</p>
          )}
          {ingestError && !ingestLoading && (
            <p className="text-sm text-red-500 px-4 py-4">
              Failed to load services from Ops API. Check that Ops is running and the token is correct.
            </p>
          )}
          {!ingestLoading && !ingestError && socketServices.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-4">
              No socket services returned by Ops API. This is expected if Ops is not yet configured.
            </p>
          )}
          {socketServices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-40">Service</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-32">Redis Health</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-28">Process</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Connection</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-48">Host (Redis lease)</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {socketServices.map((svc, idx) => {
                    const isLast = idx === socketServices.length - 1
                    const redisLamp = ingestRedisHealthLamp(svc.id, status)
                    const procLamp = ingestProcessLamp(svc.process_active)
                    const effectiveEnv = resolveEffectiveRedisControlEnv(svc, socketServices)
                    const block = ingestActionBlock(canOperate, disableScript, pageEnv, effectiveEnv)

                    const leaseEnv = (svc.redis_control_env ?? '').toLowerCase().trim()
                    const leaseBadge =
                      leaseEnv === 'dev'
                        ? <Badge variant="outline" className="text-xs border-sky-500/40 text-sky-500">dev</Badge>
                        : leaseEnv === 'prod'
                        ? <Badge variant="outline" className="text-xs border-green-600/40 text-green-600">prod</Badge>
                        : null
                    const leaseHost = svc.redis_control_host ?? null

                    return (
                      <tr key={svc.id} className={cn(!isLast && 'border-b')}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">{svc.label}</div>
                          <div className="text-xs text-muted-foreground font-mono">{svc.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <IngestLampDot lamp={redisLamp.lamp} title={redisLamp.title} />
                            <span className="text-xs text-muted-foreground capitalize">{redisLamp.lamp}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusLamp lamp={
                              procLamp === 'green' ? 'green'
                              : procLamp === 'red' ? 'red'
                              : procLamp === 'yellow' ? 'yellow'
                              : 'none'
                            } />
                            <ProcessBadge active={svc.process_active} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ConnectionCell svc={svc} status={status} elapsed={elapsed} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {leaseBadge}
                            {leaseHost && (
                              <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]" title={leaseHost}>
                                {leaseHost}
                              </span>
                            )}
                            {!leaseBadge && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                            {effectiveEnv === '__stack_conflict__' && (
                              <Badge variant="destructive" className="text-xs">conflict</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ControlButtons
                            svc={svc}
                            actionBlock={block}
                            onAction={openConfirm}
                          />
                          {block !== 'none' && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                              {ingestActionBlockMessage(block)}
                            </p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status details grid */}
      {status?.socket && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm">Redis Health Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Massive WS */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Massive WS</p>
                {status.socket.massive ? (
                  <>
                    <div className="text-xs">
                      Connected:{' '}
                      <span className={status.socket.massive.ws_connected ? 'text-green-500' : 'text-red-500'}>
                        {String(status.socket.massive.ws_connected ?? '—')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last msg: {status.socket.massive.last_msg_age_s != null ? fmtAge(status.socket.massive.last_msg_age_s) : '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Reconnects: {status.socket.massive.ws_reconnects ?? '—'}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No data</p>
                )}
              </div>

              {/* IB Ingestor */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">IB Ingestor</p>
                {status.socket.ib_ingestor ? (
                  <>
                    <div className="text-xs">
                      Connected:{' '}
                      <span className={status.socket.ib_ingestor.connected ? 'text-green-500' : 'text-red-500'}>
                        {String(status.socket.ib_ingestor.connected ?? '—')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Client ID: {status.socket.ib_ingestor.client_id ?? '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Probe: {fmtTimestamp(status.socket.ib_ingestor.last_ib_probe_at)}
                      {status.socket.ib_ingestor.ib_probe_stale ? (
                        <span className="text-red-400 ml-1">stale</span>
                      ) : status.socket.ib_ingestor.ib_probe_ok === true ? (
                        <span className="text-green-400 ml-1">ok</span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No data</p>
                )}
              </div>

              {/* IB Account Agent */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">IB Account Agent</p>
                {status.socket.ib_account_agent ? (
                  <>
                    <div className="text-xs">
                      Connected:{' '}
                      <span className={status.socket.ib_account_agent.connected ? 'text-green-500' : 'text-red-500'}>
                        {String(status.socket.ib_account_agent.connected ?? '—')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Service alive:{' '}
                      {status.socket.ib_account_agent.service_alive === false ? (
                        <span className="text-red-400">false</span>
                      ) : (
                        <span>{String(status.socket.ib_account_agent.service_alive ?? '—')}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last msg: {status.socket.ib_account_agent.last_msg_age_s != null ? fmtAge(status.socket.ib_account_agent.last_msg_age_s) : '—'}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No data</p>
                )}
              </div>

              {/* IB Operator */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">IB Operator</p>
                {status.socket.ib_operator ? (
                  <>
                    <div className="text-xs">
                      Connected:{' '}
                      <span className={status.socket.ib_operator.connected ? 'text-green-500' : 'text-red-500'}>
                        {String(status.socket.ib_operator.connected ?? '—')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Service alive:{' '}
                      {status.socket.ib_operator.service_alive === false ? (
                        <span className="text-red-400">false</span>
                      ) : (
                        <span>{String(status.socket.ib_operator.service_alive ?? '—')}</span>
                      )}
                    </div>
                    {status.socket.ib_operator.host && (
                      <div className="text-xs text-muted-foreground">
                        Host: {status.socket.ib_operator.host.client_id ?? '—'}
                        {ibSlotProbeUnhealthy(status.socket.ib_operator.host) && (
                          <span className="text-red-400 ml-1">probe stale</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No data</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!statusLoading && !status?.socket && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Monitor /status not loaded or socket block missing — Redis health lamps will show gray.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation dialog */}
      <Dialog open={confirm.open} onOpenChange={open => !open && setConfirm(CLOSED_CONFIRM)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm.title}</DialogTitle>
            <DialogDescription>{confirm.description}</DialogDescription>
          </DialogHeader>
          {actionError && (
            <p className="text-sm text-red-500 rounded border border-red-500/30 bg-red-500/10 px-3 py-2">
              {actionError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirm(CLOSED_CONFIRM)}
              disabled={controlMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void executeConfirmed()}
              disabled={controlMutation.isPending}
            >
              {controlMutation.isPending ? 'Running…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
