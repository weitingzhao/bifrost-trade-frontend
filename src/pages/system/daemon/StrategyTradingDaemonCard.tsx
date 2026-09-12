import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { StatusResponse } from '@/types/monitor'
import { DenseTag } from '@/components/data-display'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  computeIbBrokerGroupLamp,
  computeStrategyTradingDaemonLamp,
} from '@/utils/daemonLamps'
import {
  DAEMON_SELF_CHECK_LABELS,
  DAEMON_STATE_LABELS,
  STATUS_FIELDS,
  STRATEGY_METRIC_LABEL_COMPACT,
  formatDaemonBlockReasons,
  formatDaemonBlockReasonsCompact,
} from '@/utils/daemonLabels'
import {
  fmtTs,
  fmtUsd,
  HeartbeatGroup,
  IbServiceRow,
  LampDot,
  Row,
  ConnectionTag,
  daemonIbServiceListClass,
  useCtrlAction,
} from './daemonShared'
import {
  daemonBlockReasonClass,
  daemonCardStatusSubtitleClass,
  daemonCardTitleRowClass,
  daemonConnectionsBlockClass,
  daemonGroupTitleClass,
  daemonHedgeStatusRowClass,
  daemonIbGroupSummaryClass,
  daemonIbGroupSummaryTextClass,
  daemonMetricGridClass,
  daemonMetricLabelClass,
  daemonMetricValueClass,
  daemonSocketLinkClass,
  daemonThreeColGridClass,
} from './daemonUi'

function buildStatusSummaryItems(
  autoStatus: Record<string, unknown> | null | undefined,
): { label: string; value: string }[] {
  return STATUS_FIELDS.map(([k, label]) => {
    const v = autoStatus?.[k]
    let out: string
    if (v == null) {
      out = '—'
    } else if (k === 'ts') {
      out = fmtTs(v as number)
    } else if (k === 'spot' && typeof v === 'number') {
      out = fmtUsd(v)
    } else if (k === 'daemon_state') {
      out = DAEMON_STATE_LABELS[String(v)] ?? String(v)
    } else {
      out = String(v)
    }
    return { label, value: out }
  })
}

export function StrategyTradingDaemonCard({
  data,
  onInvalidate,
}: {
  data: StatusResponse
  onInvalidate: () => void
}) {
  const [nextHb, setNextHb] = useState<number | null>(null)
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000)

  const ctrl = useCtrlAction(onInvalidate)
  const hedgeCtrl = useCtrlAction()

  const hb = data.daemon?.heartbeat
  const intervalSec = hb?.heartbeat_interval_sec ?? 10
  const suspended = data.daemon?.trading?.trading_suspended ?? false
  const autoStatus = data.daemon?.trading?.auto_status

  useEffect(() => {
    const id = setInterval(() => setNowSec(Date.now() / 1000), 1_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function update() {
      setNextHb(hb?.daemon_alive && hb?.last_ts != null
        ? Math.max(0, Math.ceil(hb.last_ts + intervalSec - nowSec))
        : null)
    }
    update()
    const id = setInterval(update, 1_000)
    return () => clearInterval(id)
  }, [hb?.daemon_alive, hb?.last_ts, intervalSec, nowSec])

  const { lamp: ibGroupLamp, title: ibGroupTitle } = computeIbBrokerGroupLamp(data, hb)
  const daemonOverallLamp = computeStrategyTradingDaemonLamp(hb, ibGroupLamp)
  const daemonHealthTitle = !hb
    ? 'No Strategy Trading Daemon heartbeat is available.'
    : !hb.daemon_alive
      ? 'Strategy Trading Daemon heartbeat is stale or stopped.'
      : daemonOverallLamp === 'green'
        ? 'Strategy Trading Daemon heartbeat and IB broker health are OK.'
        : ibGroupTitle

  const selfCheck =
    DAEMON_SELF_CHECK_LABELS[data.daemon?.self_check ?? ''] ?? data.daemon?.self_check ?? '—'
  const blockReasonsText = formatDaemonBlockReasons(data.daemon.block_reasons)
  const blockReasonsCompact = formatDaemonBlockReasonsCompact(data.daemon.block_reasons)

  let statusLabel = 'Not running'
  if (hb?.daemon_alive) {
    statusLabel = 'Running'
  } else if (hb?.graceful_shutdown_at != null) {
    statusLabel = 'Not running (graceful stop)'
  } else if (hb) {
    statusLabel = `Not running (${selfCheck})`
  }

  const hedgeStatusCompact = !hb
    ? '—'
    : hb.daemon_alive
      ? (hb.hedge_running ? 'Run' : 'Pause')
      : 'Down'

  const statusSummaryItems = buildStatusSummaryItems(
    autoStatus as Record<string, unknown> | undefined,
  )
  const compactMetrics = statusSummaryItems.filter(
    ({ label }) => label !== 'Updated at' && label !== 'Daemon state',
  )


  return (
    <div className="space-y-4">
      <div>
        <div className={daemonCardTitleRowClass}>
          <LampDot lamp={daemonOverallLamp} title={daemonHealthTitle} />
          <span className="font-semibold">Strategy Trading Daemon</span>
          <span className={daemonCardStatusSubtitleClass}>{statusLabel}</span>
          {hb?.daemon_alive && (
            <DenseTag variant={suspended ? 'warning' : 'success'} size="cell">
              {suspended ? 'Suspended' : 'Hedge enabled'}
            </DenseTag>
          )}
          {hb?.mock_hedging && (
            <DenseTag variant="warning" size="cell">MOCK</DenseTag>
          )}
        </div>
        {blockReasonsText !== 'None' && (
          <p className="mt-1 text-xs text-muted-foreground">
            Block reasons: <span className={daemonBlockReasonClass}>{blockReasonsText}</span>
          </p>
        )}
      </div>

      {(ctrl.msg.text || hedgeCtrl.msg.text) && (
        <Alert variant={(ctrl.msg.isErr || hedgeCtrl.msg.isErr) ? 'destructive' : 'default'} className="py-2">
          <AlertDescription className="text-sm">
            {ctrl.msg.text || hedgeCtrl.msg.text}
          </AlertDescription>
        </Alert>
      )}

      <div className={daemonThreeColGridClass}>
        <div className="space-y-3">
          <HeartbeatGroup
            hb={hb}
            label="Heartbeat"
            countdown={nextHb}
            intervalSec={intervalSec}
            staleHint={
              hb && !hb.daemon_alive && hb.last_ts != null
                ? 'Timed out; may have been kill -9 or crash'
                : hb?.graceful_shutdown_at != null
                  ? `Gracefully stopped at ${fmtTs(hb.graceful_shutdown_at)}`
                  : undefined
            }
          />
          {hb && (
            <>
              <Separator />
              <div className={daemonConnectionsBlockClass}>
                <p className={daemonGroupTitleClass}>Connections</p>
                <Row label="IB Connected">
                  <ConnectionTag connected={hb.ib_connected === true} />
                </Row>
                <Row label="IB Client ID">
                  <span>{hb.ib_client_id ?? '—'}</span>
                </Row>
                <Row label="Redis Quotes">
                  <ConnectionTag connected={hb.redis_quotes_connected === true} />
                </Row>
                {hb.next_retry_ts != null && hb.next_retry_ts > nowSec && (
                  <Row label="IB retry in">
                    <span>{Math.ceil(hb.next_retry_ts - nowSec)}s</span>
                  </Row>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          <p className={daemonGroupTitleClass}>IB broker</p>
          <div className={daemonIbGroupSummaryClass}>
            <LampDot lamp={ibGroupLamp} title={ibGroupTitle} />
            <span className={daemonIbGroupSummaryTextClass}>{ibGroupTitle}</span>
          </div>
          <div className={daemonIbServiceListClass}>
            <IbServiceRow label="IB Operator" svcId="ib_operator" status={data} />
            <IbServiceRow label="IB Ingestor" svcId="ib_ingestor" status={data} />
            <IbServiceRow label="IB Account Agent" svcId="ib_account_agent" status={data} />
          </div>
          <Link to="/system/socket" className={daemonSocketLinkClass}>
            Open Socket services…
          </Link>
        </div>

        <div className="space-y-3">
          <p className={daemonGroupTitleClass}>Trading control</p>
          <div className={daemonHedgeStatusRowClass}>
            <LampDot lamp={daemonOverallLamp} title={daemonHealthTitle} />
            <span className="text-muted-foreground">
              Hedge loop: {hedgeStatusCompact}
              {blockReasonsCompact ? ` · ${blockReasonsCompact}` : ''}
            </span>
            {hb?.daemon_alive && (
              <DenseTag variant={suspended ? 'warning' : 'success'} size="cell">
                {suspended ? 'Suspended' : 'Hedge enabled'}
              </DenseTag>
            )}
          </div>

          <div className={daemonMetricGridClass}>
            {compactMetrics.map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2">
                <span className={daemonMetricLabelClass}>{STRATEGY_METRIC_LABEL_COMPACT[label] ?? label}</span>
                <span className={daemonMetricValueClass}>{value}</span>
              </div>
            ))}
          </div>

          {/* Hedging controls and the active structure / gate set moved to
              Strategy → Instances: suspending hedging or flattening the book is
              a trading decision, not daemon telemetry. This page keeps whether
              the process is alive, whether the broker is connected, and what it
              has done. */}
          <p className="text-dense-caption text-muted-foreground">
            Hedge controls and the active strategy live on{' '}
            <Link to="/strategy/instances" className="hover:underline">
              Strategy · Instances
            </Link>
            .
          </p>
        </div>
      </div>

    </div>
  )
}
