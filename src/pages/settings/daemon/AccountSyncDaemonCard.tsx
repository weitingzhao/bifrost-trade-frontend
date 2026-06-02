import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { StatusResponse, AccountSyncHeartbeat } from '@/types/monitor'
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
  daemonIbServiceListClass,
} from './daemonShared'
import {
  daemonCardStatusSubtitleClass,
  daemonCardTitleRowClass,
  daemonGroupTitleClass,
  daemonIbGroupSummaryClass,
  daemonIbGroupSummaryTextClass,
  daemonIbServiceRowClass,
  daemonIbServiceRowInnerClass,
  daemonKvLabelClass,
  daemonLampTextClass,
  daemonManualHintClass,
  daemonSocketLinkClass,
  daemonSyncDetailsGridClass,
  daemonSyncLagWarnClass,
  daemonThreeColGridClass,
} from './daemonUi'

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
  const displayAsdLamp = asdLamp === 'none' ? 'red' : asdLamp

  const statusLabel = !asd
    ? 'No heartbeat row'
    : asd.daemon_alive
      ? 'Running (OK)'
      : 'Not running (heartbeat stale)'

  return (
    <div className="space-y-4">
      <div>
        <div className={daemonCardTitleRowClass}>
          <LampDot lamp={displayAsdLamp} title={asdTitle} />
          <span className="font-semibold">Account Sync Daemon</span>
          <span className={daemonCardStatusSubtitleClass}>{statusLabel}</span>
        </div>
        {asd && !asd.daemon_alive && (
          <p className="mt-1 text-xs text-muted-foreground">
            Last DB heartbeat is older than ~35s. Start the process via Ops above or manual script, then check PostgreSQL and IB Account Agent stream.
          </p>
        )}
        {!asd && (
          <p className="mt-1 text-xs text-muted-foreground">
            Start Account Sync Daemon from Ops (authenticated) or run{' '}
            <code className="text-[11px]">python scripts/systemd/run_account_sync_daemon.py --config …</code>
          </p>
        )}
      </div>

      <div className={daemonThreeColGridClass}>
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
            <p className="mt-2 text-xs text-muted-foreground opacity-85">
              Monitor marks the daemon down if last update is older than ~35s.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <p className={daemonGroupTitleClass}>IB account</p>
          <div className={daemonIbGroupSummaryClass}>
            <LampDot lamp={ibAccountGroupLamp} title={ibAccountGroupTitle} />
            <span className={daemonIbGroupSummaryTextClass}>{ibAccountGroupTitle}</span>
          </div>
          <div className={daemonIbServiceListClass}>
            <IbServiceRow label="IB Account Agent" svcId="ib_account_agent" status={data} />
            <div className={daemonIbServiceRowClass}>
              <span className={daemonKvLabelClass}>Sync</span>
              <div className={daemonIbServiceRowInnerClass} title={asdTitle}>
                <LampDot lamp={displayAsdLamp} />
                <span className={daemonLampTextClass(displayAsdLamp)}>
                  {aaLamp.lamp} / {displayAsdLamp}
                </span>
              </div>
            </div>
          </div>
          <Link to="/settings/socket" className={daemonSocketLinkClass}>
            Open Socket services…
          </Link>
        </div>

        <div className="space-y-3">
          <p className={daemonGroupTitleClass}>Sync details</p>
          {asd ? (
            <div className={daemonSyncDetailsGridClass}>
              <div>
                <span className="text-muted-foreground">Stream lag </span>
                <span className={cn('font-mono', (asd.stream_lag ?? 0) > 5 && daemonSyncLagWarnClass)}>
                  {asd.stream_lag ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Sync version </span>
                <span className="font-mono">{asd.last_sync_version ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Accounts </span>
                <span className="font-mono">{asd.accounts_synced ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Positions </span>
                <span className="font-mono">{asd.positions_synced ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Executions </span>
                <span className="font-mono">{asd.executions_synced ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Open orders </span>
                <span className="font-mono">{asd.open_orders_synced ?? '—'}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>
      </div>

      <Separator />
      <p className={daemonManualHintClass}>
        <strong className="text-foreground/80">Start (manual):</strong>{' '}
        <code className="text-[11px]">python scripts/systemd/run_account_sync_daemon.py --config config/config.dev.yaml</code>
        {' '}(dev){' '}|{' '}
        <code className="text-[11px]">python scripts/systemd/run_account_sync_daemon.py --config config/config.prod.yaml</code>
        {' '}(prod). Or use Ops on this page if your host runs systemd.
      </p>
    </div>
  )
}
