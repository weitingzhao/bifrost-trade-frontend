import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsPanel, TabsPanelContent, TabsTrigger } from '@/components/ui/tabs'
import { PageShell } from '@/components/layout'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useSubscribeExecutions } from '@/hooks/useSubscribeExecutions'
import { SubscribePageHeader } from '@/pages/settings/subscribe/SubscribePageHeader'
import { SnapshotTab } from '@/pages/settings/subscribe/SnapshotTab'
import { RedisTab } from '@/pages/settings/subscribe/RedisTab'
import { ServicesTab } from '@/pages/settings/subscribe/ServicesTab'

export default function SubscribePage() {
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
