import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { StatusLamp } from '@/components/StatusLamp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

function fmtTs(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleString()
}

function fmtSecs(secs: number | null | undefined): string {
  if (secs == null) return '—'
  return `${Math.round(secs)}s`
}

function YesNo({ value }: { value: boolean }) {
  return (
    <Badge variant={value ? 'default' : 'secondary'}>
      {value ? 'Yes' : 'No'}
    </Badge>
  )
}

export default function DaemonStatusPage() {
  const { data, isLoading, isError, error } = useMonitorStatus()

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const hb = data?.daemon.heartbeat
  const sync = data?.account_sync_daemon?.heartbeat

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Daemon Status</h1>
        {data && <StatusLamp lamp={data.health.status_lamp} />}
        {data && (
          <span className="text-xs text-muted-foreground">
            v{data.status_schema_version}
          </span>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Daemon Heartbeat */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <StatusLamp lamp={data?.daemon.lamp ?? 'red'} />
              Daemon Heartbeat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {hb == null ? (
              <p className="text-muted-foreground">No heartbeat received</p>
            ) : (
              <>
                <Row label="Alive"><YesNo value={hb.daemon_alive} /></Row>
                <Row label="IB Connected"><YesNo value={hb.ib_connected} /></Row>
                <Row label="IB Client ID">
                  <span className="font-mono">{hb.ib_client_id ?? '—'}</span>
                </Row>
                <Row label="Redis Quotes"><YesNo value={hb.redis_quotes_connected} /></Row>
                <Row label="Mock Hedging">
                  {hb.mock_hedging ? <Badge variant="destructive">Mock</Badge> : <Badge variant="secondary">Off</Badge>}
                </Row>
                <Row label="Hedge Running"><YesNo value={hb.hedge_running} /></Row>
                <Separator />
                <Row label="Last Heartbeat">
                  <span className="text-muted-foreground">{fmtTs(hb.last_ts)}</span>
                </Row>
                <Row label="Interval">
                  <span className="text-muted-foreground">{fmtSecs(hb.heartbeat_interval_sec)}</span>
                </Row>
                {hb.next_retry_ts != null && (
                  <Row label="Next Retry">
                    <span className="text-muted-foreground">{fmtSecs(hb.seconds_until_retry)}</span>
                  </Row>
                )}
                {hb.last_control_message && (
                  <Row label="Last Control">
                    <span className="font-mono text-xs">{hb.last_control_message}</span>
                  </Row>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Trading Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Trading Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Suspended">
              {data?.daemon.trading.trading_suspended
                ? <Badge variant="destructive">Suspended</Badge>
                : <Badge variant="default">Active</Badge>}
            </Row>
            {data && data.daemon.block_reasons.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Block Reasons</p>
                {data.daemon.block_reasons.map((r, i) => (
                  <p key={i} className="text-xs font-mono text-destructive">{r}</p>
                ))}
              </div>
            )}
            {data && data.daemon.block_reasons.length === 0 && (
              <p className="text-muted-foreground text-xs">No active blocks</p>
            )}
          </CardContent>
        </Card>

        {/* Account Sync Daemon */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Account Sync Daemon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sync == null ? (
              <p className="text-muted-foreground">No sync daemon heartbeat</p>
            ) : (
              <>
                <Row label="Alive"><YesNo value={sync.daemon_alive} /></Row>
                <Row label="Stream Lag">
                  <span className={sync.stream_lag > 5 ? 'text-destructive font-mono' : 'font-mono text-muted-foreground'}>
                    {sync.stream_lag}
                  </span>
                </Row>
                <Row label="Sync Version">
                  <span className="font-mono text-muted-foreground">{sync.last_sync_version}</span>
                </Row>
                <Row label="Last Heartbeat">
                  <span className="text-muted-foreground">{fmtTs(sync.last_ts)}</span>
                </Row>
                <Row label="Interval">
                  <span className="text-muted-foreground">{fmtSecs(sync.heartbeat_interval_sec)}</span>
                </Row>
              </>
            )}
          </CardContent>
        </Card>

        {/* Celery Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Celery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Broker">
              {data?.celery.broker_connected
                ? <Badge variant="default">Connected</Badge>
                : <Badge variant="destructive">Disconnected</Badge>}
            </Row>
            <Row label="Workers">
              <span className="text-muted-foreground">{data?.celery.workers.length ?? 0}</span>
            </Row>
            <Row label="IB Worker">
              <YesNo value={data?.celery.worker_ib_connected ?? false} />
            </Row>
            {data?.celery.worker_ib_client_id != null && (
              <Row label="IB Client ID">
                <span className="font-mono">{data.celery.worker_ib_client_id}</span>
              </Row>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}
