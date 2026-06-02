import { useState, useEffect, useCallback } from 'react'
import { Cpu } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useMonitorStatus, useOperations } from '@/hooks/useMonitorStatus'
import { OpsHostEnvPill } from '@/pages/settings/socket/OpsHostEnvPill'
import { DaemonEngineOpsSection } from './daemon/DaemonEngineOpsSection'
import { StrategyTradingDaemonCard } from './daemon/StrategyTradingDaemonCard'
import { AccountSyncDaemonCard } from './daemon/AccountSyncDaemonCard'
import { RecentOperationsTable } from './daemon/RecentOperationsTable'
import { useDaemonEngineOps } from './daemon/useDaemonEngineOps'
import { daemonElevatedCardClass } from './daemon/daemonUi'

const DAEMON_PAGE_INFO =
  'Ops start/stop for Strategy Trading Engine and Account Sync; monitor status, suspend/resume hedging, and recent automated operations. Logs: footer LogPanel → Daemon sources.'

function DaemonCardSkeleton() {
  return <Skeleton className="h-40 w-full rounded-lg" />
}

export default function DaemonStatusPage() {
  const { data, isLoading, isError, error } = useMonitorStatus()
  const { data: opsData } = useOperations(20)
  const qc = useQueryClient()
  const [nextAsdHb, setNextAsdHb] = useState<number | null>(null)

  const ops = useDaemonEngineOps(data ?? null)

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['monitor', 'status'] })
  }, [qc])

  const asd = data?.account_sync_daemon?.heartbeat
  const asIntervalSec = typeof asd?.heartbeat_interval_sec === 'number'
    ? Math.max(2, Math.min(120, asd.heartbeat_interval_sec))
    : 5

  useEffect(() => {
    function update() {
      const now = Date.now() / 1000
      setNextAsdHb(asd?.daemon_alive && asd?.last_ts != null
        ? Math.max(0, Math.ceil(asd.last_ts + asIntervalSec - now))
        : null)
    }
    update()
    const id = setInterval(update, 1_000)
    return () => clearInterval(id)
  }, [asd?.daemon_alive, asd?.last_ts, asIntervalSec])

  if (isLoading) {
    return (
      <PageShell padding="default" className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
        <DaemonCardSkeleton />
        <DaemonCardSkeleton />
        <DaemonCardSkeleton />
        <DaemonCardSkeleton />
      </PageShell>
    )
  }

  if (isError || !data) {
    return (
      <PageShell padding="default">
        <Alert variant="destructive">
          <AlertDescription>{(error as Error)?.message ?? 'Failed to load monitor status'}</AlertDescription>
        </Alert>
      </PageShell>
    )
  }

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Cpu className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              Daemon
              <InfoTooltip text={DAEMON_PAGE_INFO} />
            </span>
            <StatusLamp lamp={ops.rollupLamp} className="h-3 w-3" title={ops.rollupTitle} />
            <OpsHostEnvPill pill={ops.hostColumn.pill} title={ops.hostColumn.title} />
          </span>
        }
        titleSize="large"
        description="This Ops instance (config / executor) · Ops start/stop via shared token with Settings → Socket"
      />

      <Card variant="elevated" size="sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Process control</CardTitle>
        </CardHeader>
        <CardContent className={daemonElevatedCardClass}>
          <DaemonEngineOpsSection status={data} ops={ops} />
        </CardContent>
      </Card>

      <Card variant="elevated" size="sm">
        <CardContent className={daemonElevatedCardClass}>
          <StrategyTradingDaemonCard data={data} onInvalidate={invalidate} />
        </CardContent>
      </Card>

      <Card variant="elevated" size="sm">
        <CardContent className={daemonElevatedCardClass}>
          <AccountSyncDaemonCard
            data={data}
            asd={asd}
            nextAsdHb={nextAsdHb}
            asIntervalSec={asIntervalSec}
          />
        </CardContent>
      </Card>

      <Card variant="elevated" size="sm">
        <CardContent className={daemonElevatedCardClass}>
          <RecentOperationsTable operations={opsData?.operations ?? []} />
        </CardContent>
      </Card>
    </PageShell>
  )
}
