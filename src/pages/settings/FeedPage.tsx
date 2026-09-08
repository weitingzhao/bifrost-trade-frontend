import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsPanel, TabsPanelContent, TabsTrigger } from '@/components/ui/tabs'
import { Link } from 'react-router-dom'
import { PageShell } from '@/components/layout'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useSubscribeExecutions } from '@/hooks/useSubscribeExecutions'
import { SubscribePageHeader } from '@/pages/settings/subscribe/SubscribePageHeader'
import { SnapshotTab } from '@/pages/settings/subscribe/SnapshotTab'
import { RedisTab } from '@/pages/settings/subscribe/RedisTab'
import { ServicesTab } from '@/pages/settings/subscribe/ServicesTab'

/**
 * Feed — `/settings/feed`.
 *
 * Trade's view of what it consumes: the snapshot it takes, the Redis keys it
 * reads off the shared bus, and the IB services those keys come from. The
 * console that can restart any of it is the Ops Console; this page is the
 * consumption side, which is the side that explains a stale quote.
 *
 * Absorbed the two-link `Feed · Interactive Brokers` page, which had no
 * content of its own.
 */
export default function FeedPage() {
  const { data: status, isLoading, isError, error, refetch, dataUpdatedAt } = useMonitorStatus()
  const executionsQuery = useSubscribeExecutions(dataUpdatedAt)

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-64 rounded-lg" />
      </PageShell>
    )
  }

  if (isError) {
    return (
      <PageShell>
        <QueryErrorAlert error={error} onRetry={() => void refetch()} />
      </PageShell>
    )
  }

  const statusTick = dataUpdatedAt
  const executions = executionsQuery.data?.items ?? []

  return (
    <PageShell className="space-y-4">
      <SubscribePageHeader status={status} statusTick={statusTick} />

      <p className="text-dense-label text-muted-foreground">
        Reading only. Starting, stopping or reconnecting these services is the
        Ops platform's job —{' '}
        <a
          href={`${import.meta.env.VITE_OPS_CONSOLE_URL ?? 'http://127.0.0.1:5180'}/#ib-client`}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          Ops Console · IB Client
        </a>
        , or the upstream block on{' '}
        <Link to="/operations/daemon" className="hover:underline">
          Daemon
        </Link>
        .
      </p>

      <Tabs defaultValue="snapshot">
        <TabsPanel>
          <TabsList variant="line" className="bg-muted/20 px-2">
            <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
            <TabsTrigger value="redis">Redis</TabsTrigger>
            <TabsTrigger value="services">IB services</TabsTrigger>
          </TabsList>

          <TabsPanelContent>
            <Card variant="elevated" size="sm" className="p-4">
              <TabsContent value="snapshot">
                <SnapshotTab
                  status={status}
                  executions={executions}
                  executionsLoading={executionsQuery.isLoading}
                  executionsError={
                    executionsQuery.error instanceof Error
                      ? executionsQuery.error
                      : executionsQuery.error
                        ? new Error(String(executionsQuery.error))
                        : null
                  }
                  executionsIsError={executionsQuery.isError}
                  onRetryExecutions={() => void executionsQuery.refetch()}
                />
              </TabsContent>
              <TabsContent value="redis">
                <RedisTab status={status} statusTick={statusTick} />
              </TabsContent>
              <TabsContent value="services">
                <ServicesTab status={status} statusTick={statusTick} />
              </TabsContent>
            </Card>
          </TabsPanelContent>
        </TabsPanel>
      </Tabs>
    </PageShell>
  )
}
