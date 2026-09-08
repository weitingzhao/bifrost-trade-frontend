/**
 * Hedging: what the trading daemon is set to do, and the controls that change it.
 *
 * These lived on the Daemon page under System, beside heartbeat and IB
 * connection rows. They are not daemon telemetry: suspending hedging, resuming
 * it and flattening the book are trading decisions, and they belong with the
 * strategy instances they act on rather than in a health console. The Daemon
 * page keeps what it is actually for — is the process alive, is the broker
 * connected, what has it done.
 *
 * D10 BLOCKED — Emergency flatten posts to the daemon's own control channel,
 * which the freeze governs; the button is here because the Owner may need it,
 * not because the system may use it.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Play } from 'lucide-react'
import { postFlatten, postResume, postSuspend } from '@/api/monitor'
import type { StatusResponse } from '@/types/monitor'
import { DenseTag } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Row, useCtrlAction } from '@/pages/settings/daemon/daemonShared'

export function HedgeControlCard({
  data,
  onInvalidate,
}: {
  data: StatusResponse | undefined
  onInvalidate: () => void
}) {
  const [flattenOpen, setFlattenOpen] = useState(false)
  const [flattenBusy, setFlattenBusy] = useState(false)
  const ctrl = useCtrlAction(onInvalidate)
  const hedgeCtrl = useCtrlAction()

  const suspended = data?.daemon?.trading?.trading_suspended ?? false
  const alive = data?.daemon?.heartbeat?.daemon_alive ?? false
  const active = data?.strategy?.active

  async function handleFlatten() {
    setFlattenBusy(true)
    try {
      await hedgeCtrl.run(postFlatten, {
        loading: 'Requesting flatten…',
        success: 'Flatten sent — hedge process will consume and execute.',
      })
      setFlattenOpen(false)
      onInvalidate()
    } finally {
      setFlattenBusy(false)
    }
  }

  return (
    <Card variant="elevated">
      <CardContent className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-dense-body font-semibold">Hedging</span>
          <DenseTag variant={suspended ? 'warning' : alive ? 'success' : 'neutral'} size="cell">
            {suspended ? 'Suspended' : alive ? 'Hedge enabled' : 'Daemon not running'}
          </DenseTag>
          <Link
            to="/operations/daemon"
            className="ml-auto text-dense-label text-muted-foreground hover:underline"
            title="Heartbeat, broker connection and what the daemon has done"
          >
            Daemon status
          </Link>
        </div>

        {ctrl.msg.text || hedgeCtrl.msg.text ? (
          <Alert variant={ctrl.msg.isErr || hedgeCtrl.msg.isErr ? 'destructive' : 'default'} className="py-2">
            <AlertDescription className="text-sm">
              {ctrl.msg.text || hedgeCtrl.msg.text}
            </AlertDescription>
          </Alert>
        ) : null}

        {active?.structure?.name || active?.gate_safety?.name ? (
          <div className="space-y-1">
            {active.structure?.name ? (
              <Row label="Structure">
                <span className="max-w-[200px] truncate">{active.structure.name}</span>
              </Row>
            ) : null}
            {active.gate_safety?.name ? (
              <Row label="Gate set">
                <span className="max-w-[200px] truncate">{active.gate_safety.name}</span>
              </Row>
            ) : null}
          </div>
        ) : (
          <p className="text-dense-label text-muted-foreground">
            No active structure or gate set is configured.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={suspended}
            onClick={() =>
              ctrl.run(postSuspend, {
                loading: 'Setting suspend…',
                success: 'Suspend set — daemon will pause hedging on next heartbeat.',
              })
            }
          >
            Suspend
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!suspended}
            onClick={() =>
              ctrl.run(postResume, {
                loading: 'Setting resume…',
                success: 'Resume set — daemon will resume hedging on next heartbeat.',
              })
            }
          >
            <Play className="mr-1 h-3 w-3" />
            Resume
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 gap-1 text-xs"
            onClick={() => setFlattenOpen(true)}
          >
            <AlertTriangle className="h-3 w-3" />
            Emergency
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={flattenOpen}
        title="Emergency flatten"
        message="Request immediate flatten of hedge positions? This sends POST /control/flatten to the daemon."
        confirmLabel="Confirm flatten"
        confirming={flattenBusy}
        onConfirm={() => void handleFlatten()}
        onCancel={() => setFlattenOpen(false)}
      />
    </Card>
  )
}
