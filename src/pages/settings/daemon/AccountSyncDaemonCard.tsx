import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { StatusResponse, AccountSyncHeartbeat } from '@/types/monitor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  computeAccountSyncLamp,
  computeAccountSyncIbGroupLamp,
} from '@/utils/daemonLamps'
import { ingestRedisHealthLamp } from '@/utils/socketIngestLamp'
import {
  HeartbeatGroup,
  IbServiceRow,
  LampDot,
} from './daemonShared'

export function AccountSyncDaemonCard({
  data,
  asd,
  nextAsdHb,
  asIntervalSec,
}: {
  data: StatusResponse
  asd: AccountSyncHeartbeat | null | undefined
  nextAsdHb: number | null
  asIntervalSec: number
}) {
  const { lamp: asdLamp, title: asdTitle } = computeAccountSyncLamp(data)
  const { lamp: ibAccountGroupLamp, title: ibAccountGroupTitle } = computeAccountSyncIbGroupLamp(data)
  const aaLamp = ingestRedisHealthLamp('ib_account_agent', data)

  const statusLabel = !asd
    ? 'No heartbeat row'
    : asd.daemon_alive
      ? 'Running (OK)'
      : 'Not running (heartbeat stale)'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <LampDot lamp={asdLamp === 'none' ? 'red' : asdLamp} title={asdTitle} />
          Account Sync Daemon
          <span className="text-sm font-normal text-muted-foreground">{statusLabel}</span>
        </CardTitle>
        {asd && !asd.daemon_alive && (
          <p className="text-xs text-muted-foreground mt-1">
            Last DB heartbeat is older than ~35s. Start the process via Ops above or manual script, then check PostgreSQL and IB Account Agent stream.
          </p>
        )}
        {!asd && (
          <p className="text-xs text-muted-foreground mt-1">
            Start Account Sync Daemon from Ops (authenticated) or run{' '}
            <code className="text-[11px]">python scripts/systemd/run_account_sync_daemon.py --config …</code>
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <HeartbeatGroup
              hb={asd}
              label="Heartbeat"
              countdown={nextAsdHb}
              intervalSec={asIntervalSec}
              staleHint={
                asd && !asd.daemon_alive && asd.last_ts != null
                  ? 'Timed out; start Account Sync Daemon or check Redis/PostgreSQL'
                  : undefined
              }
            />
            {asd?.daemon_alive && (
              <p className="text-xs text-muted-foreground mt-2 opacity-85">
                Monitor marks the daemon down if last update is older than ~35s.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IB account</p>
            <div className="flex items-center gap-1.5 mb-2">
              <LampDot lamp={ibAccountGroupLamp} title={ibAccountGroupTitle} />
              <span className="text-xs text-muted-foreground line-clamp-2">{ibAccountGroupTitle}</span>
            </div>
            <div className="space-y-0 divide-y divide-border rounded border">
              <div className="px-3">
                <IbServiceRow label="IB Account Agent" svcId="ib_account_agent" status={data} />
              </div>
              <div className="px-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Sync</span>
                  <div className="flex items-center gap-1.5" title={asdTitle}>
                    <LampDot lamp={asdLamp === 'none' ? 'red' : asdLamp} />
                    <span className={cn(
                      asdLamp === 'green' ? 'text-green-600 dark:text-green-400'
                      : asdLamp === 'red' || asdLamp === 'none' ? 'text-red-500'
                      : 'text-yellow-500',
                    )}>
                      {aaLamp.lamp} / {asdLamp === 'none' ? 'red' : asdLamp}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Link
              to="/settings/socket"
              className="text-xs text-link hover:text-link-hover underline underline-offset-2"
            >
              Open Socket services…
            </Link>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sync details</p>
            {asd ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div><span className="text-muted-foreground">Stream lag</span>{' '}
                  <span className={cn('font-mono', asd.stream_lag > 5 ? 'text-red-500' : '')}>{asd.stream_lag ?? '—'}</span>
                </div>
                <div><span className="text-muted-foreground">Sync version</span>{' '}
                  <span className="font-mono">{asd.last_sync_version ?? '—'}</span>
                </div>
                <div><span className="text-muted-foreground">Accounts</span>{' '}
                  <span className="font-mono">{asd.accounts_synced ?? '—'}</span>
                </div>
                <div><span className="text-muted-foreground">Positions</span>{' '}
                  <span className="font-mono">{asd.positions_synced ?? '—'}</span>
                </div>
                <div><span className="text-muted-foreground">Executions</span>{' '}
                  <span className="font-mono">{asd.executions_synced ?? '—'}</span>
                </div>
                <div><span className="text-muted-foreground">Open orders</span>{' '}
                  <span className="font-mono">{asd.open_orders_synced ?? '—'}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
          </div>
        </div>

        <Separator />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground/80">Start (manual):</strong>{' '}
          <code className="text-[11px]">python scripts/systemd/run_account_sync_daemon.py --config config/config.dev.yaml</code>
          {' '}(dev){' '}|{' '}
          <code className="text-[11px]">python scripts/systemd/run_account_sync_daemon.py --config config/config.prod.yaml</code>
          {' '}(prod). Or use Ops on this page if your host runs systemd.
        </p>
      </CardContent>
    </Card>
  )
}
