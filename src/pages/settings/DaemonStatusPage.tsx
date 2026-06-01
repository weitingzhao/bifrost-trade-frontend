import { useState, useEffect, useCallback } from 'react'
import { PageShell } from '@/components/layout'
import { useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useMonitorStatus, useOperations } from '@/hooks/useMonitorStatus'
import { DaemonEngineOpsSection } from './daemon/DaemonEngineOpsSection'
import { StrategyTradingDaemonCard } from './daemon/StrategyTradingDaemonCard'
import { AccountSyncDaemonCard } from './daemon/AccountSyncDaemonCard'
import { RecentOperationsTable } from './daemon/RecentOperationsTable'

export default function DaemonStatusPage() {
  const { data, isLoading, isError, error } = useMonitorStatus()
  const { data: opsData } = useOperations(20)
  const qc = useQueryClient()
  const [nextAsdHb, setNextAsdHb] = useState<number | null>(null)

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
      <PageShell className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </PageShell>
    )
  }

  if (isError || !data) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertDescription>{(error as Error)?.message ?? 'Failed to load monitor status'}</AlertDescription>
        </Alert>
      </PageShell>
    )
  }

  return (
    <PageShell className="space-y-6">
      <DaemonEngineOpsSection status={data} />
      <StrategyTradingDaemonCard data={data} onInvalidate={invalidate} />
      <AccountSyncDaemonCard
        data={data}
        asd={asd}
        nextAsdHb={nextAsdHb}
        asIntervalSec={asIntervalSec}
      />
      <RecentOperationsTable operations={opsData?.operations ?? []} />
    </PageShell>
  )
}
