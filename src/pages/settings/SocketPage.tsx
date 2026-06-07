import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { PageShell } from '@/components/layout'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import {
  useMarketIngestServices,
  useOpsHealth,
  useOpsCapabilities,
  useControlMarketIngest,
  useClearConflictLeases,
} from '@/hooks/useSocketServices'
import { useIngestControlPoll } from '@/hooks/useIngestControlPoll'
import { getOpsToken, type MarketIngestAction } from '@/api/ops'
import { marketIngestServicesForSocketAggregate, type MarketIngestServiceRow } from '@/utils/socketIngestLamp'
import {
  normalizedPageDevProd,
  hasStackConflict,
  INGEST_CONTROL_PENDING_DIALOG_MESSAGE,
  ingestControlActionLabel,
  ingestControlConfirmDescription,
} from '@/utils/ingestOpsShared'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { SocketPageHeader } from '@/pages/settings/socket/SocketPageHeader'
import { LocalControlAgentPanel } from '@/pages/settings/socket/LocalControlAgentPanel'
import { IngestServicesTable } from '@/pages/settings/socket/IngestServicesTable'
import {
  CLOSED_SOCKET_CONFIRM,
  type SocketConfirmState,
} from '@/pages/settings/socket/socketIngestControls'
import {
  socketConflictAlertClass,
  socketConflictClearButtonClass,
  socketElevatedCardClass,
  socketMonitorHintClass,
  socketSectionBlockClass,
  socketSectionTitleClass,
} from '@/pages/settings/socket/socketIngestUi'

export default function SocketPage() {
  const [token, setToken] = useState<string>(() => getOpsToken())
  const [elapsed, setElapsed] = useState(0)
  const [wallNowSec, setWallNowSec] = useState(() => Math.floor(Date.now() / 1000))
  const [confirm, setConfirm] = useState<SocketConfirmState>(CLOSED_SOCKET_CONFIRM)
  const [actionError, setActionError] = useState<string | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(e => e + 1)
      setWallNowSec(Math.floor(Date.now() / 1000))
    }, 1_000)
    return () => clearInterval(id)
  }, [])

  const { data: statusData, isLoading: statusLoading, isError: statusError } = useMonitorStatus()

  useEffect(() => {
    queueMicrotask(() => setElapsed(0))
  }, [statusData])

  const { data: ingestData, isLoading: ingestLoading, isError: ingestError } =
    useMarketIngestServices(token)
  const { data: opsHealth } = useOpsHealth(token)
  const { data: caps } = useOpsCapabilities(token)

  const controlMutation = useControlMarketIngest()
  const clearLeasesMutation = useClearConflictLeases()

  const services: MarketIngestServiceRow[] = ingestData?.services ?? []
  const socketServices = marketIngestServicesForSocketAggregate(services)
  const status = statusData ?? null

  const { startingIds, stoppingIds, onControlQueued, refresh } =
    useIngestControlPoll(socketServices, status)

  const canOperate = caps?.capabilities?.can_operate === true
  const disableScript =
    opsHealth?.local_control === 'subprocess' && opsHealth.market_ingest_script_control !== true
  const pageEnv = normalizedPageDevProd(opsHealth?.config_profile ?? null)
  const conflict = hasStackConflict(socketServices)
  const showLocalAgent = (opsHealth?.executor_mode ?? '').toLowerCase() === 'agent'

  function handleTokenChange(t: string) {
    setToken(t)
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.ingestServices })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.opsHealth })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.capabilities })
  }

  const refreshAll = useCallback(() => {
    refresh()
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.capabilities })
  }, [qc, refresh])

  function openConfirm(svc: MarketIngestServiceRow, action: MarketIngestAction) {
    setActionError(null)
    setConfirm({
      open: true,
      title: `${ingestControlActionLabel(action)} ${svc.label}`,
      description: ingestControlConfirmDescription(svc, action),
      svc,
      action,
    })
  }

  async function executeConfirmed() {
    if (!confirm.svc || !confirm.action) return
    setActionError(null)
    try {
      const result = await controlMutation.mutateAsync({
        serviceId: confirm.svc.id,
        action: confirm.action,
      })
      setConfirm(CLOSED_SOCKET_CONFIRM)
      if (result.queued) {
        onControlQueued(confirm.svc.id, confirm.action)
      } else {
        refresh()
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Control request failed.')
    }
  }

  return (
    <PageShell padding="default" className="space-y-3">
      <SocketPageHeader
        services={socketServices}
        status={status}
        opsHealth={opsHealth}
        caps={caps}
        token={token}
        onTokenChange={handleTokenChange}
        onRefresh={refreshAll}
      />

      {conflict && (
        <div className={socketConflictAlertClass} role="alert">
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
            className={socketConflictClearButtonClass}
            disabled={!canOperate || clearLeasesMutation.isPending}
            onClick={() => clearLeasesMutation.mutate()}
          >
            {clearLeasesMutation.isPending ? 'Clearing…' : 'Clear Leases'}
          </Button>
        </div>
      )}

      {showLocalAgent && (
        <Card variant="elevated" size="sm" className={socketElevatedCardClass}>
          <LocalControlAgentPanel opsHealth={opsHealth} />
        </Card>
      )}

      <Card variant="elevated" size="sm" className={socketElevatedCardClass} aria-label="Socket service units">
        <div className={socketSectionBlockClass}>
          <h2 className={socketSectionTitleClass}>Ingest services</h2>
          <IngestServicesTable
            services={socketServices}
            status={status}
            elapsed={elapsed}
            pageEnv={pageEnv}
            disableScript={disableScript}
            canOperate={canOperate}
            startingIds={startingIds}
            stoppingIds={stoppingIds}
            wallNowSec={wallNowSec}
            onAction={openConfirm}
            isLoading={ingestLoading}
            isError={ingestError}
          />
          {(statusError || (!statusLoading && !status?.socket)) && !ingestLoading && (
            <p className={socketMonitorHintClass}>
              Monitor GET /status unavailable — Connection column and IB logical summary need{' '}
              <code className="text-[11px]">/api/monitor/status</code>. If you rebuilt{' '}
              <code className="text-[11px]">api-monitor</code>, restart{' '}
              <code className="text-[11px]">nginx</code> (or reload nginx.conf with Docker DNS resolve).
            </p>
          )}
        </div>
      </Card>

      <Dialog open={confirm.open} onOpenChange={open => !open && setConfirm(CLOSED_SOCKET_CONFIRM)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm.title}</DialogTitle>
            <DialogDescription>{confirm.description}</DialogDescription>
          </DialogHeader>
          {controlMutation.isPending && !actionError && (
            <p className="text-sm text-muted-foreground">{INGEST_CONTROL_PENDING_DIALOG_MESSAGE}</p>
          )}
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
