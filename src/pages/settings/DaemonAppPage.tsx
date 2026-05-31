import { useState } from 'react'
import { postSetHeartbeatInterval, postSetAccountSyncInterval } from '@/api/monitor'
import { useMonitorStatus, useInvalidateStatus } from '@/hooks/useMonitorStatus'
import type { StatusResponse } from '@/types/monitor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Daemon App</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure daemon heartbeat intervals — takes effect on next heartbeat
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saveMsg.text && (
            <span
              className={cn(
                'text-sm',
                saveMsg.isErr ? 'text-destructive' : 'text-green-600 dark:text-green-400',
              )}
            >
              {saveMsg.text}
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            Save settings
          </Button>
        </div>
      </div>

      <div id="settings-heartbeat" className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Strategy Trading Daemon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Interval for daemon heartbeat writes (5–120 s)
            </p>
            <div className="flex items-center gap-2">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Account Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Interval for account sync writes (2–60 s)
            </p>
            <div className="flex items-center gap-2">
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function DaemonAppPage() {
  const { data: status } = useMonitorStatus()

  if (!status) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  return <DaemonAppForm status={status} />
}
