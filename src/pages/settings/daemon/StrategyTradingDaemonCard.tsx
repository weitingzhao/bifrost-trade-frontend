import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Play, Settings2 } from 'lucide-react'
import { postSuspend, postResume, postFlatten } from '@/api/monitor'
import type { StatusResponse } from '@/types/monitor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  useCtrlAction,
} from './daemonShared'
import { ConfirmDialog } from '@/pages/operations/celery/ConfirmDialog'

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
  const navigate = useNavigate()
  const [nextHb, setNextHb] = useState<number | null>(null)
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000)
  const [flattenOpen, setFlattenOpen] = useState(false)
  const [flattenBusy, setFlattenBusy] = useState(false)

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
  const daemonOverallLamp = computeStrategyTradingDaemonLamp(hb, ibGroupLamp, suspended)

  const selfCheck =
    DAEMON_SELF_CHECK_LABELS[data.daemon?.self_check ?? ''] ?? data.daemon?.self_check ?? '—'
  const blockReasonsText = formatDaemonBlockReasons(data.daemon.block_reasons)
  const blockReasonsCompact = formatDaemonBlockReasonsCompact(data.daemon.block_reasons)

  let statusLabel = 'Not running'
  if (hb?.daemon_alive) {
    statusLabel = suspended ? 'Running (hedge suspended)' : 'Running (OK)'
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

  async function handleFlatten() {
    setFlattenBusy(true)
    try {
      await hedgeCtrl.run(postFlatten, {
        loading: 'Requesting flatten…',
        success: 'Flatten sent — hedge process will consume and execute.',
      })
      setFlattenOpen(false)
      onInvalidate()
    } finally {
      setFlattenBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <LampDot lamp={daemonOverallLamp} title={ibGroupTitle} />
          Strategy Trading Daemon
          <span className="text-sm font-normal text-muted-foreground">{statusLabel}</span>
          {hb?.mock_hedging && (
            <Badge variant="destructive" className="text-[10px] px-1.5">MOCK</Badge>
          )}
        </CardTitle>
        {blockReasonsText !== 'None' && (
          <p className="text-xs text-muted-foreground mt-1">
            Block reasons: <span className="text-red-500">{blockReasonsText}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {(ctrl.msg.text || hedgeCtrl.msg.text) && (
          <Alert variant={(ctrl.msg.isErr || hedgeCtrl.msg.isErr) ? 'destructive' : 'default'} className="py-2">
            <AlertDescription className="text-sm">
              {ctrl.msg.text || hedgeCtrl.msg.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Connections</p>
                  <Row label="IB Connected">
                    <Badge variant={hb.ib_connected ? 'default' : 'destructive'} className="text-[10px] px-1.5">
                      {hb.ib_connected ? 'Yes' : 'No'}
                    </Badge>
                  </Row>
                  <Row label="IB Client ID">
                    <span className="font-mono text-xs">{hb.ib_client_id ?? '—'}</span>
                  </Row>
                  <Row label="Redis Quotes">
                    <Badge variant={hb.redis_quotes_connected ? 'default' : 'destructive'} className="text-[10px] px-1.5">
                      {hb.redis_quotes_connected ? 'Yes' : 'No'}
                    </Badge>
                  </Row>
                  {hb.next_retry_ts != null && hb.next_retry_ts > nowSec && (
                    <Row label="IB retry in">
                      <span className="font-mono text-xs tabular-nums">
                        {Math.ceil(hb.next_retry_ts - nowSec)}s
                      </span>
                    </Row>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IB broker</p>
            <div className="flex items-center gap-1.5 mb-2">
              <LampDot lamp={ibGroupLamp} title={ibGroupTitle} />
              <span className="text-xs text-muted-foreground line-clamp-2">{ibGroupTitle}</span>
            </div>
            <div className="space-y-0 divide-y divide-border rounded border">
              <div className="px-3"><IbServiceRow label="IB Operator" svcId="ib_operator" status={data} /></div>
              <div className="px-3"><IbServiceRow label="IB Ingestor" svcId="ib_ingestor" status={data} /></div>
              <div className="px-3"><IbServiceRow label="IB Account Agent" svcId="ib_account_agent" status={data} /></div>
            </div>
            <Link
              to="/settings/socket"
              className="text-xs text-link hover:text-link-hover underline underline-offset-2"
            >
              Open Socket services…
            </Link>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trading Strategy</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <LampDot
                lamp={!hb || !hb.daemon_alive ? 'red' : suspended ? 'yellow' : 'green'}
                title={hedgeStatusCompact}
              />
              <span className="text-muted-foreground">
                {hedgeStatusCompact}
                {blockReasonsCompact ? ` · ${blockReasonsCompact}` : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {compactMetrics.map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{STRATEGY_METRIC_LABEL_COMPACT[label] ?? label}</span>
                  <span className="font-mono text-right truncate">{value}</span>
                </div>
              ))}
            </div>

            {(data.strategy?.active?.structure?.name || data.strategy?.active?.gate_safety?.name) && (
              <>
                <Separator />
                <div className="space-y-1">
                  {data.strategy.active.structure?.name && (
                    <Row label="Structure">
                      <span className="text-xs font-mono truncate max-w-[140px]">
                        {data.strategy.active.structure.name}
                      </span>
                    </Row>
                  )}
                  {data.strategy.active.gate_safety?.name && (
                    <Row label="Gate set">
                      <span className="text-xs font-mono truncate max-w-[140px]">
                        {data.strategy.active.gate_safety.name}
                      </span>
                    </Row>
                  )}
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={suspended}
                onClick={() => ctrl.run(postSuspend, {
                  loading: 'Setting suspend…',
                  success: 'Suspend set — daemon will pause hedging on next heartbeat.',
                })}
              >
                Suspend
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-green-500/50 text-green-600 dark:text-green-400"
                disabled={!suspended}
                onClick={() => ctrl.run(postResume, {
                  loading: 'Setting resume…',
                  success: 'Resume set — daemon will resume hedging on next heartbeat.',
                })}
              >
                <Play className="h-3 w-3 mr-1" />
                Resume
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => navigate('/strategy/instances')}
              >
                <Settings2 className="h-3 w-3 mr-1" />
                Manage
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs gap-1"
                onClick={() => setFlattenOpen(true)}
              >
                <AlertTriangle className="h-3 w-3" />
                Emergency
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <ConfirmDialog
        open={flattenOpen}
        title="Emergency flatten"
        message="Request immediate flatten of hedge positions? This sends POST /control/flatten to the daemon."
        confirmLabel="Confirm flatten"
        confirming={flattenBusy}
        onConfirm={() => void handleFlatten()}
        onCancel={() => setFlattenOpen(false)}
      />
    </Card>
  )
}
