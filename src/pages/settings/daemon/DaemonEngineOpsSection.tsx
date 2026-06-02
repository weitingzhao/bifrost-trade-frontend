import { useMemo } from 'react'
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
import {
  formatAccountSyncOpsError,
} from '@/utils/ingestOpsShared'
import { OpsAuthBar } from '@/pages/settings/socket/OpsAuthBar'
import { LocalControlAgentPanel } from '@/pages/settings/socket/LocalControlAgentPanel'
import { IngestServicesTable } from '@/pages/settings/socket/IngestServicesTable'
import type { MarketIngestServiceRow } from '@/utils/socketIngestLamp'
import {
  CLOSED_DAEMON_CONFIRM,
  type useDaemonEngineOps,
} from './useDaemonEngineOps'
import {
  daemonDialogErrorClass,
  daemonPageIntroClass,
  daemonProcessSectionClass,
} from './daemonUi'

type DaemonOps = ReturnType<typeof useDaemonEngineOps>

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

export function DaemonEngineOpsSection({
  status,
  ops,
}: {
  status: StatusResponse | null
  ops: DaemonOps
}) {
  const {
    token,
    elapsed,
    wallNowSec,
    confirm,
    setConfirm,
    actionError,
    setActionError,
    daemonServices,
    engineConfigMissing,
    opsErr,
    ingestLoading,
    ingestError,
    opsHealth,
    caps,
    controlMutation,
    startingIds,
    stoppingIds,
    onControlQueued,
    canOperate,
    disableScript,
    pageEnv,
    refreshAll,
    handleTokenChange,
  } = ops

  const actionLabels = useMemo(
    (): Record<MarketIngestAction, string> => ({
      start: 'Start',
      stop: 'Stop',
      restart: 'Restart',
      reset: 'Reset',
    }),
    [],
  )

  function openConfirm(svc: MarketIngestServiceRow, action: MarketIngestAction) {
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
      setConfirm(CLOSED_DAEMON_CONFIRM)
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
    <div className={daemonProcessSectionClass} aria-label="Daemon process control">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className={daemonPageIntroClass}>
          Ops API: POST /ops/market-ingest/control for systemd start/stop. Authenticate here or on
          Settings → Socket; the token is shared.
        </p>
        <OpsAuthBar
          token={token}
          caps={caps}
          onTokenChange={handleTokenChange}
          onRefresh={refreshAll}
        />
      </div>

      {opsErr && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-sm">{opsErr}</AlertDescription>
        </Alert>
      )}
      {engineConfigMissing && !opsErr && (
        <p className="text-sm text-muted-foreground">
          No <code className="text-xs">trading_engine</code> row in Ops config.
          {daemonServices.some(s => s.id === 'account_sync_daemon')
            ? ' account_sync_daemon is available below.'
            : null}
        </p>
      )}

      <LocalControlAgentPanel opsHealth={opsHealth} />

      <section aria-label="Daemon ingest processes">
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

      <Dialog open={confirm.open} onOpenChange={open => !open && setConfirm(CLOSED_DAEMON_CONFIRM)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm.title}</DialogTitle>
            <DialogDescription>{confirm.message}</DialogDescription>
          </DialogHeader>
          {actionError && (
            <p className={daemonDialogErrorClass}>{actionError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(CLOSED_DAEMON_CONFIRM)} disabled={controlMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => void executeConfirmed()} disabled={controlMutation.isPending}>
              {controlMutation.isPending ? 'Running…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
