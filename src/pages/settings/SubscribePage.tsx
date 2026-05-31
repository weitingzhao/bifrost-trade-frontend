import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusLamp } from '@/components/StatusLamp'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { ingestRedisHealthLamp } from '@/utils/socketIngestLamp'

function fmtAge(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '—'
  if (sec < 60) return `${Math.round(sec)}s ago`
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`
  return `${Math.round(sec / 3600)}h ago`
}

export default function SubscribePage() {
  const { data: status, isLoading, isError, error, refetch } = useMonitorStatus()

  const ibIngest = status?.socket?.ib_ingestor
  const ibAccount = status?.socket?.ib_account_agent
  const ingestLamp = ingestRedisHealthLamp('ib_ingestor', status)
  const accountLamp = ingestRedisHealthLamp('ib_account_agent', status)

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Subscribe" description="IB event subscriptions and Redis stream health." />
        <Skeleton className="h-32 rounded-lg" />
      </PageShell>
    )
  }

  if (isError) {
    return (
      <PageShell>
        <PageHeader title="Subscribe" description="IB event subscriptions and Redis stream health." />
        <QueryErrorAlert error={error} onRetry={() => void refetch()} />
      </PageShell>
    )
  }

  const subscribed = status?.live_ui?.subscribed_tickers?.length ?? 0
  const accountHb = status?.account_sync_daemon?.heartbeat

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Subscribe"
        description="IB ingest health, daemon ticker subscriptions, and account sync streams."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <StatusLamp lamp={ingestLamp.lamp} />
              IB Ingestor
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <p>Connected: {ibIngest?.connected === true ? 'Yes' : ibIngest?.connected === false ? 'No' : '—'}</p>
            <p>Last message: {fmtAge(ibIngest?.last_msg_age_s)}</p>
            {ingestLamp.title && <p className="text-xs">{ingestLamp.title}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <StatusLamp lamp={accountLamp.lamp} />
              IB Account Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <p>Connected: {ibAccount?.connected === true ? 'Yes' : ibAccount?.connected === false ? 'No' : '—'}</p>
            <p>Last message: {fmtAge(ibAccount?.last_msg_age_s)}</p>
            {accountLamp.title && <p className="text-xs">{accountLamp.title}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daemon ticker (Redis)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <p>Subscribed symbols: {subscribed}</p>
            <p>Reference indices: {status?.live_ui?.reference_indices?.length ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Account sync</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <p>Last sync: {accountHb?.last_ts != null ? new Date(accountHb.last_ts * 1000).toLocaleString() : '—'}</p>
            <p>Daemon alive: {accountHb?.daemon_alive === true ? 'yes' : accountHb ? 'no' : '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" size="sm" asChild>
        <Link to="/settings/socket">Open Socket &amp; ingest controls</Link>
      </Button>
    </PageShell>
  )
}
