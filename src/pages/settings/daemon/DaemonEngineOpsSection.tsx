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
  INGEST_CONTROL_PENDING_DIALOG_MESSAGE,
  ingestControlActionLabel,
  ingestControlConfirmDescription,
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

  function openConfirm(svc: MarketIngestServiceRow, action: MarketIngestAction) {
    setActionError(null)
    setConfirm({
      open: true,
      title: `${ingestControlActionLabel(action)} ${svc.label}`,
      message: ingestControlConfirmDescription(svc, action),
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
          Ops API: POST /ops/market-ingest/control for start, stop, and force restart. Authenticate
          here or on Settings → Socket; the token is shared.
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
          {controlMutation.isPending && !actionError && (
            <p className="text-sm text-muted-foreground">{INGEST_CONTROL_PENDING_DIALOG_MESSAGE}</p>
          )}
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
