import { useState } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { postSetHeartbeatInterval, postSetAccountSyncInterval } from '@/api/monitor'
import { useMonitorStatus, useInvalidateStatus } from '@/hooks/useMonitorStatus'
import type { StatusResponse } from '@/types/monitor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  daemonFormFieldRowClass,
  daemonFormGridClass,
  daemonFormHintClass,
  daemonFormPanelClass,
  daemonFormSaveStatusClass,
} from './daemon/daemonFormUi'
import { daemonElevatedCardClass } from './daemon/daemonUi'

const DAEMON_APP_INFO =
  'Configure Strategy Trading and Account Sync heartbeat write intervals. Changes apply on the next heartbeat cycle.';

// ─── Inner form — receives loaded status as props ─────────────────────────────

function DaemonAppForm({ status }: { status: StatusResponse }) {
  const invalidateStatus = useInvalidateStatus()

  const [daemonSec, setDaemonSec] = useState(
    () => status.daemon?.heartbeat?.heartbeat_interval_sec ?? 30,
  )
  const [syncSec, setSyncSec] = useState(
    () => status.account_sync_daemon?.heartbeat?.heartbeat_interval_sec ?? 5,
  )

  const [saveMsg, setSaveMsg] = useState({ text: '', isErr: false })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg({ text: 'Saving…', isErr: false })
    const clampedDaemon = Math.max(5, Math.min(120, Math.round(daemonSec) || 30))
    const clampedSync = Math.max(2, Math.min(60, Math.round(syncSec) || 5))
    try {
      const [r1, r2] = await Promise.all([
        postSetHeartbeatInterval(clampedDaemon),
        postSetAccountSyncInterval(clampedSync),
      ])
      if (r1.ok && r2.ok) {
        setSaveMsg({ text: 'Settings saved. Takes effect on next heartbeat.', isErr: false })
        setDaemonSec(clampedDaemon)
        setSyncSec(clampedSync)
        invalidateStatus()
      } else {
        setSaveMsg({ text: r1.error ?? r2.error ?? 'Save failed', isErr: true })
      }
    } catch (e) {
      setSaveMsg({ text: String(e), isErr: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1">
            Daemon App
            <InfoTooltip text={DAEMON_APP_INFO} />
          </span>
        }
        titleSize="large"
        description="Configure daemon heartbeat intervals — takes effect on next heartbeat"
        actions={
          <>
            {saveMsg.text && (
              <span className={daemonFormSaveStatusClass(saveMsg.isErr)}>
                {saveMsg.text}
              </span>
            )}
            <Button onClick={handleSave} disabled={saving}>
              Save settings
            </Button>
          </>
        }
      />

      <div id="settings-heartbeat" className={daemonFormGridClass}>
        <Card variant="elevated" size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Strategy Trading Daemon</CardTitle>
          </CardHeader>
          <CardContent className={daemonElevatedCardClass}>
            <div className={daemonFormPanelClass}>
              <p className={daemonFormHintClass}>
                Interval for daemon heartbeat writes (5–120 s)
              </p>
              <div className={daemonFormFieldRowClass}>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={daemonSec}
                  onChange={(e) => setDaemonSec(parseInt(e.target.value, 10) || 30)}
                  className="w-24 text-right"
                  aria-label="Strategy Trading Daemon Heartbeat interval in seconds"
                />
                <span className="text-sm text-muted-foreground">sec</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Account Sync</CardTitle>
          </CardHeader>
          <CardContent className={daemonElevatedCardClass}>
            <div className={daemonFormPanelClass}>
              <p className={daemonFormHintClass}>
                Interval for account sync writes (2–60 s)
              </p>
              <div className={daemonFormFieldRowClass}>
                <Input
                  type="number"
                  min={2}
                  max={60}
                  step={1}
                  value={syncSec}
                  onChange={(e) => setSyncSec(parseFloat(e.target.value) || 5)}
                  className="w-24 text-right"
                  aria-label="Account Sync Heartbeat interval in seconds"
                />
                <span className="text-sm text-muted-foreground">sec</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function DaemonAppPage() {
  const { data: status } = useMonitorStatus()

  if (!status) {
    return (
      <PageShell padding="default" className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className={daemonFormGridClass}>
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </PageShell>
    )
  }

  return <DaemonAppForm status={status} />
}
