import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Cpu } from 'lucide-react'
import { StatusLamp } from '@/components/StatusLamp'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { StatusResponse } from '@/types/monitor'
import type { MarketIngestAction } from '@/api/ops'
import { getOpsToken } from '@/api/ops'
import {
  useMarketIngestServices,
  useOpsHealth,
  useOpsCapabilities,
  useControlMarketIngest,
} from '@/hooks/useSocketServices'
import { useIngestControlPoll } from '@/hooks/useIngestControlPoll'
import {
  aggregateDaemonProcessesHealthFromStatus,
  aggregateIngestRedisHealthLamp,
  marketIngestServicesForDaemonAggregate,
  type MarketIngestServiceRow,
} from '@/utils/socketIngestLamp'
import {
  formatAccountSyncOpsError,
  normalizedPageDevProd,
  socketServicesHostColumnDisplay,
} from '@/utils/ingestOpsShared'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { OpsAuthBar } from '@/pages/settings/socket/OpsAuthBar'
import { OpsHostEnvPill } from '@/pages/settings/socket/OpsHostEnvPill'
import { LocalControlAgentPanel } from '@/pages/settings/socket/LocalControlAgentPanel'
import { IngestServicesTable } from '@/pages/settings/socket/IngestServicesTable'

type ConfirmState = {
  open: boolean
  title: string
  message: string
  svc: MarketIngestServiceRow | null
  action: MarketIngestAction | null
}

const CLOSED_CONFIRM: ConfirmState = {
  open: false,
  title: '',
  message: '',
  svc: null,
  action: null,
}

function confirmMessage(svc: MarketIngestServiceRow, action: MarketIngestAction): string {
  if (svc.id === 'account_sync_daemon') {
    if (action === 'start') {
      return `Start ${svc.label}? Launches run_account_sync_daemon.py via systemd; syncs IB account stream to PostgreSQL.`
    }
    if (action === 'stop') {
      return `Stop ${svc.label}? systemd sends SIGTERM. Account sync pauses until started again.`
    }
    if (action === 'reset') {
      return `Reset ${svc.label}? Restarts the Account Sync process (same end state as Restart).`
    }
    return `Restart ${svc.label}? Brief gap in account/position sync.`
  }
  if (action === 'start') {
    return `Start ${svc.label}? Launches run_engine.py via systemd (or local Ops subprocess on Mac). Hedging still follows DB suspend/resume.`
  }
  if (action === 'stop') {
    return `Stop ${svc.label}? systemd sends SIGTERM (graceful). This is not the same as Suspend in Trading Strategy below.`
  }
  if (action === 'reset') {
    return `Reset ${svc.label}? This restarts the Engine process (same end state as Restart).`
  }
  return `Restart ${svc.label}? Brief outage; equivalent to stop then start.`
}

export function DaemonEngineOpsSection({ status }: { status: StatusResponse | null }) {
  const [token, setToken] = useState(() => getOpsToken())
  const [elapsed, setElapsed] = useState(0)
  const [wallNowSec, setWallNowSec] = useState(() => Math.floor(Date.now() / 1000))
  const [confirm, setConfirm] = useState<ConfirmState>(CLOSED_CONFIRM)
  const [actionError, setActionError] = useState<string | null>(null)

  const qc = useQueryClient()

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(e => e + 1)
      setWallNowSec(Math.floor(Date.now() / 1000))
    }, 1_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    queueMicrotask(() => setElapsed(0))
  }, [status])

  const { data: ingestData, isLoading: ingestLoading, isError: ingestError } =
    useMarketIngestServices(token)
  const { data: opsHealth } = useOpsHealth(token)
  const { data: caps } = useOpsCapabilities(token)
  const controlMutation = useControlMarketIngest(token)

  const allServices = ingestData?.services ?? []
  const daemonServices = marketIngestServicesForDaemonAggregate(allServices)
  const engineConfigMissing = !ingestLoading && !ingestError && !daemonServices.some(s => s.id === 'trading_engine')

  const opsErr = useMemo(() => {
    if (ingestError) return 'Failed to load Ops services'
    if (ingestData && typeof ingestData.error === 'string' && ingestData.error.trim()) {
      return ingestData.error
    }
    return null
  }, [ingestError, ingestData])

  const { startingIds, stoppingIds, onControlQueued, refresh } =
    useIngestControlPoll(daemonServices)

  const canOperate = caps?.capabilities?.can_operate === true
  const disableScript =
    opsHealth?.local_control === 'subprocess' && opsHealth.market_ingest_script_control !== true
  const pageEnv = normalizedPageDevProd(opsHealth?.config_profile ?? null)

  const hostColumn = useMemo(
    () => socketServicesHostColumnDisplay({
      configProfile: opsHealth?.config_profile ?? null,
      localControl: opsHealth?.local_control ?? null,
      marketIngestScriptControl: opsHealth?.market_ingest_script_control === true,
    }),
    [opsHealth],
  )

  const rollup = useMemo(() => {
    if (daemonServices.length > 0) {
      return aggregateIngestRedisHealthLamp(daemonServices, status)
    }
    return aggregateDaemonProcessesHealthFromStatus(status)
  }, [daemonServices, status])

  const rollupLamp = rollup.lamp === 'none' ? 'gray' : rollup.lamp

  const refreshAll = useCallback(() => {
    refresh()
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.capabilities })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.ops.opsHealth })
  }, [refresh, qc])

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
      reset: 'Reset',
    }
    setActionError(null)
    setConfirm({
      open: true,
      title: `${actionLabels[action]} ${svc.label}`,
      message: confirmMessage(svc, action),
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
      setConfirm(CLOSED_CONFIRM)
      if (result.queued) {
        onControlQueued(confirm.svc.id, confirm.action)
      } else {
        refreshAll()
      }
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Control request failed.'
      if (confirm.svc.id === 'account_sync_daemon') {
        msg = formatAccountSyncOpsError(msg)
      }
      setActionError(msg)
    }
  }

  return (
    <section className="space-y-0" aria-labelledby="daemon-ops-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Cpu className="h-5 w-5 text-primary shrink-0" aria-hidden />
            <StatusLamp lamp={rollupLamp} className="h-3 w-3" title={rollup.title} />
            <h1 id="daemon-ops-heading" className="text-2xl font-semibold tracking-tight">Daemon</h1>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span title={hostColumn.title}>This Ops instance (config / executor)</span>
            <OpsHostEnvPill pill={hostColumn.pill} title={hostColumn.title} />
          </p>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Ops API: POST /ops/market-ingest/control for systemd start/stop. Authenticate here or on Settings → Socket; the token is shared.
          </p>
        </div>
        <OpsAuthBar
          token={token}
          caps={caps}
          onTokenChange={handleTokenChange}
          onRefresh={refreshAll}
        />
      </div>

      {opsErr && (
        <Alert variant="destructive" className="mt-4 py-2">
          <AlertDescription className="text-sm">{opsErr}</AlertDescription>
        </Alert>
      )}
      {engineConfigMissing && !opsErr && (
        <p className="text-sm text-muted-foreground mt-4">
          No <code className="text-xs">trading_engine</code> row in Ops config.
          {daemonServices.some(s => s.id === 'account_sync_daemon')
            ? ' account_sync_daemon is available below.'
            : null}
        </p>
      )}

      <LocalControlAgentPanel opsHealth={opsHealth} />

      <section className="border-t border-border pt-6 mt-6" aria-label="Daemon process control">
        <IngestServicesTable
          services={daemonServices}
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
          variant="daemon"
          emptyHint="No trading_engine or account_sync_daemon rows in Ops config (backend/ops/market_ingest_config.py)."
        />
      </section>

      <Dialog open={confirm.open} onOpenChange={open => !open && setConfirm(CLOSED_CONFIRM)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm.title}</DialogTitle>
            <DialogDescription>{confirm.message}</DialogDescription>
          </DialogHeader>
          {actionError && (
            <p className="text-sm text-red-500 rounded border border-red-500/30 bg-red-500/10 px-3 py-2">
              {actionError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(CLOSED_CONFIRM)} disabled={controlMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => void executeConfirmed()} disabled={controlMutation.isPending}>
              {controlMutation.isPending ? 'Running…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
