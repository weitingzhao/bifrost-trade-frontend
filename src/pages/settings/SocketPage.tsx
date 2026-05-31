import { useState, useEffect, useCallback } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw } from 'lucide-react'
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
import { getOpsToken, type MarketIngestAction } from '@/api/ops'
import {
  ingestRedisHealthLamp,
  ingestProcessLamp,
  marketIngestServicesForSocketAggregate,
  type MarketIngestServiceRow,
} from '@/utils/socketIngestLamp'
import {
  resolveEffectiveRedisControlEnv,
  ingestActionBlock,
  ingestActionBlockMessage,
  normalizedPageDevProd,
  hasStackConflict,
} from '@/utils/ingestOpsShared'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { cn } from '@/lib/utils'
import {
  ConnectionCell,
  ControlButtons,
  IngestLampDot,
  ProcessBadge,
  CLOSED_SOCKET_CONFIRM,
  type SocketConfirmState,
} from '@/pages/settings/socket/socketIngestUi'
import { SocketTokenPanel } from '@/pages/settings/socket/SocketTokenPanel'
import { SocketRedisDetails } from '@/pages/settings/socket/SocketRedisDetails'

export default function SocketPage() {
  const [token, setToken] = useState<string>(() => getOpsToken())
  const [elapsed, setElapsed] = useState(0)
  const [confirm, setConfirm] = useState<SocketConfirmState>(CLOSED_SOCKET_CONFIRM)
  const [actionError, setActionError] = useState<string | null>(null)

  const qc = useQueryClient()

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1_000)
    return () => clearInterval(id)
  }, [])

  const { data: statusData, isLoading: statusLoading } = useMonitorStatus()

  useEffect(() => {
    queueMicrotask(() => setElapsed(0))
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
      setConfirm(CLOSED_SOCKET_CONFIRM)
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

  const configProfileBadge =
    opsHealth?.config_profile === 'dev' || opsHealth?.config_profile === 'development' ? (
      <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-500 text-xs">Dev</Badge>
    ) : opsHealth?.config_profile === 'prod' || opsHealth?.config_profile === 'production' ? (
      <Badge variant="outline" className="border-green-600/40 bg-green-600/10 text-green-600 text-xs">Prod</Badge>
    ) : opsHealth ? (
      <Badge variant="outline" className="text-xs text-muted-foreground">Custom</Badge>
    ) : null

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
              {caps && (
                <span className={cn('text-xs', caps.capabilities?.can_operate ? 'text-green-500' : 'text-muted-foreground')}>
                  {caps.capabilities?.can_operate ? '✓ can operate' : '✗ no operate permission'}
                </span>
              )}
            </div>
            <SocketTokenPanel token={token} onTokenChange={handleTokenChange} />
          </div>
          {opsHealth?.config_profile && (
            <p className="text-xs text-muted-foreground">
              Config profile: <span className="font-mono">{opsHealth.config_profile}</span>
              {pageEnv && ` · controls only apply to ${pageEnv} stack`}
            </p>
          )}
        </CardContent>
      </Card>

      {conflict && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-orange-500">Dev/Prod stack conflict detected</p>
            <p className="text-xs text-muted-foreground">
              Both dev and prod Ops stacks have active Redis control leases on IB services.
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
              Failed to load services from Ops API. Check Ops is running and the token is correct.
            </p>
          )}
          {!ingestLoading && !ingestError && socketServices.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-4">No socket services returned by Ops API.</p>
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
                            {svc.redis_control_host && (
                              <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]" title={svc.redis_control_host}>
                                {svc.redis_control_host}
                              </span>
                            )}
                            {!leaseBadge && <span className="text-xs text-muted-foreground">—</span>}
                            {effectiveEnv === '__stack_conflict__' && (
                              <Badge variant="destructive" className="text-xs">conflict</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ControlButtons svc={svc} actionBlock={block} onAction={openConfirm} />
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

      {status?.socket && <SocketRedisDetails status={status} />}

      {!statusLoading && !status?.socket && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Monitor /status not loaded — Redis health lamps will show gray.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirm.open} onOpenChange={open => !open && setConfirm(CLOSED_SOCKET_CONFIRM)}>
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
            <Button variant="outline" onClick={() => setConfirm(CLOSED_SOCKET_CONFIRM)} disabled={controlMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => void executeConfirmed()} disabled={controlMutation.isPending}>
              {controlMutation.isPending ? 'Running…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
