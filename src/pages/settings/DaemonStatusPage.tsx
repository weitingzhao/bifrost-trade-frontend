import { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useMonitorStatus, useOperations } from '@/hooks/useMonitorStatus'
import { postSuspend, postResume, postFlatten } from '@/api/monitor'
import { StatusLamp } from '@/components/StatusLamp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { DaemonHeartbeat } from '@/types/monitor'
import {
  ibServiceLamp,
  computeIbBrokerGroupLamp,
  computeAccountSyncLamp,
  computeAccountSyncIbGroupLamp,
  computeStrategyTradingDaemonLamp,
  type DaemonLamp,
} from '@/utils/daemonLamps'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTs(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleString()
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function pnlClass(n: number): string {
  return n >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
}

function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-2 text-sm', className)}>
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

function LampDot({ lamp, title }: { lamp: DaemonLamp; title?: string }) {
  const color = lamp === 'green' ? 'bg-green-500'
    : lamp === 'yellow' ? 'bg-yellow-400'
    : lamp === 'red' ? 'bg-red-500'
    : 'bg-muted-foreground/30'
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full shrink-0', color)}
      title={title}
    />
  )
}

function IbServiceRow({ label, svcId, status }: {
  label: string
  svcId: 'ib_operator' | 'ib_ingestor' | 'ib_account_agent'
  status: import('@/types/monitor').StatusResponse | undefined
}) {
  const { lamp, title } = ibServiceLamp(svcId, status ?? null)
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <LampDot lamp={lamp} title={title} />
        <span className={lamp === 'green' ? 'text-green-600 dark:text-green-400' : lamp === 'red' ? 'text-red-500' : 'text-yellow-500'}>{lamp}</span>
      </div>
    </div>
  )
}

function HeartbeatGroup({
  hb, label, countdown, intervalSec,
}: {
  hb: DaemonHeartbeat | { last_ts: number | null; daemon_alive: boolean; heartbeat_interval_sec: number } | null | undefined
  label: string
  countdown: number | null
  intervalSec: number
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      {hb == null ? (
        <p className="text-xs text-muted-foreground">No heartbeat data</p>
      ) : (
        <div className="space-y-1">
          <Row label="Last heartbeat">
            <span className="font-mono text-xs">{fmtTs(hb.last_ts)}</span>
          </Row>
          {hb.daemon_alive && countdown != null && (
            <Row label="Next heartbeat">
              <span className="font-mono text-xs tabular-nums">{countdown}s</span>
            </Row>
          )}
          <Row label="Interval">
            <span className="font-mono text-xs">{intervalSec}s</span>
          </Row>
        </div>
      )}
    </div>
  )
}

// ── Control action hook ───────────────────────────────────────────────────────

type CtrlMsg = { text: string; isErr: boolean }

function useCtrlAction(onSuccess?: () => void) {
  const [msg, setMsg] = useState<CtrlMsg>({ text: '', isErr: false })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  useEffect(() => () => clear(), [clear])

  const run = useCallback(async (
    fn: () => Promise<{ ok?: boolean; error?: string }>,
    messages: { loading: string; success: string },
  ) => {
    clear()
    setMsg({ text: messages.loading, isErr: false })
    try {
      const res = await fn()
      if (res.ok === false) throw new Error(res.error ?? 'Unknown error')
      setMsg({ text: messages.success, isErr: false })
      onSuccess?.()
    } catch (e) {
      setMsg({ text: (e as Error).message, isErr: true })
    }
    timer.current = setTimeout(() => setMsg({ text: '', isErr: false }), 6000)
  }, [clear, onSuccess])

  return { msg, run }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DaemonStatusPage() {
  const { data, isLoading, isError, error } = useMonitorStatus()
  const { data: opsData } = useOperations(50)
  const qc = useQueryClient()
  const [nextHb, setNextHb] = useState<number | null>(null)
  const [nextAsdHb, setNextAsdHb] = useState<number | null>(null)

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['monitor', 'status'] })
  }, [qc])

  const ctrl = useCtrlAction(invalidate)

  const hb = data?.daemon?.heartbeat
  const asd = data?.account_sync_daemon?.heartbeat

  const intervalSec = hb?.heartbeat_interval_sec ?? 10
  const asIntervalSec = typeof asd?.heartbeat_interval_sec === 'number'
    ? Math.max(2, Math.min(120, asd.heartbeat_interval_sec))
    : 5

  useEffect(() => {
    function update() {
      const now = Date.now() / 1000
      setNextHb(hb?.daemon_alive && hb?.last_ts != null
        ? Math.max(0, Math.ceil(hb.last_ts + intervalSec - now))
        : null)
      setNextAsdHb(asd?.daemon_alive && asd?.last_ts != null
        ? Math.max(0, Math.ceil(asd.last_ts + asIntervalSec - now))
        : null)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [hb?.daemon_alive, hb?.last_ts, intervalSec, asd?.daemon_alive, asd?.last_ts, asIntervalSec])

  const suspended = data?.daemon?.trading?.trading_suspended ?? false
  const { lamp: ibGroupLamp, title: ibGroupTitle } = computeIbBrokerGroupLamp(data, hb)
  const daemonOverallLamp = computeStrategyTradingDaemonLamp(hb, ibGroupLamp, suspended)
  const { lamp: asdLamp, title: asdTitle } = computeAccountSyncLamp(data)
  const { lamp: ibAccountGroupLamp, title: ibAccountGroupTitle } = computeAccountSyncIbGroupLamp(data)

  const activeStructure = data?.strategy?.active?.structure?.name
  const activeGate = data?.strategy?.active?.gate_safety?.name
  const autoStatus = data?.daemon?.trading?.auto_status

  const operations = opsData?.operations ?? []

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
      </div>
    </div>
  )

  if (isError) return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Page header + controls */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Daemon Status</h1>
        {data && <StatusLamp lamp={data.health.status_lamp} />}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button
            size="sm" variant="outline"
            className="h-8 text-xs border-yellow-400 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
            onClick={() => ctrl.run(postSuspend, { loading: 'Setting suspend…', success: 'Suspend set — daemon will pause hedging on next heartbeat.' })}
          >
            Suspend
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-8 text-xs border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
            onClick={() => ctrl.run(postResume, { loading: 'Setting resume…', success: 'Resume set — daemon will resume hedging on next heartbeat.' })}
          >
            Resume
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-8 text-xs border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => ctrl.run(postFlatten, { loading: 'Requesting flatten…', success: 'Flatten sent — hedge process will consume and execute.' })}
          >
            Flatten
          </Button>
        </div>
      </div>

      {ctrl.msg.text && (
        <Alert variant={ctrl.msg.isErr ? 'destructive' : 'default'} className="py-2">
          <AlertDescription className="text-sm">{ctrl.msg.text}</AlertDescription>
        </Alert>
      )}

      {/* ── Strategy Trading Daemon ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LampDot lamp={daemonOverallLamp} title={ibGroupTitle} />
            Strategy Trading Daemon
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {!hb ? '—' : hb.daemon_alive ? 'Running' : 'Not running'}
            </span>
            {hb?.mock_hedging && (
              <Badge variant="destructive" className="text-[10px] px-1.5">MOCK</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-6">
            {/* Col 1: Heartbeat */}
            <div className="space-y-3">
              <HeartbeatGroup
                hb={hb}
                label="Heartbeat"
                countdown={nextHb}
                intervalSec={intervalSec}
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
                  </div>
                </>
              )}
            </div>

            {/* Col 2: IB Broker Services */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IB Services</p>
              <div className="flex items-center gap-1.5 mb-2">
                <LampDot lamp={ibGroupLamp} title={ibGroupTitle} />
                <span className="text-xs text-muted-foreground">{ibGroupTitle.slice(0, 60)}</span>
              </div>
              <div className="space-y-0 divide-y divide-border rounded border">
                <div className="px-3">
                  <IbServiceRow label="IB Operator" svcId="ib_operator" status={data} />
                </div>
                <div className="px-3">
                  <IbServiceRow label="IB Ingestor" svcId="ib_ingestor" status={data} />
                </div>
                <div className="px-3">
                  <IbServiceRow label="IB Account Agent" svcId="ib_account_agent" status={data} />
                </div>
              </div>
              {hb?.last_control_message && (
                <div className="mt-2 rounded bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Last control:</p>
                  <p className="text-xs font-mono mt-0.5">{hb.last_control_message}</p>
                </div>
              )}
            </div>

            {/* Col 3: Trading Status */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trading</p>
              <div className="space-y-1">
                <Row label="Status">
                  {suspended
                    ? <Badge variant="destructive" className="text-[10px] px-1.5">Suspended</Badge>
                    : <Badge variant="default" className="text-[10px] px-1.5">Active</Badge>}
                </Row>
                <Row label="Hedge running">
                  <Badge variant={hb?.hedge_running ? 'default' : 'secondary'} className="text-[10px] px-1.5">
                    {hb?.hedge_running ? 'Yes' : 'No'}
                  </Badge>
                </Row>
              </div>

              {(activeStructure || activeGate) && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active strategy</p>
                    {activeStructure && (
                      <Row label="Structure">
                        <span className="text-xs font-mono truncate max-w-[140px]">{activeStructure}</span>
                      </Row>
                    )}
                    {activeGate && (
                      <Row label="Gate set">
                        <span className="text-xs font-mono truncate max-w-[140px]">{activeGate}</span>
                      </Row>
                    )}
                  </div>
                </>
              )}

              {data && data.daemon.block_reasons.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Block reasons</p>
                    {data.daemon.block_reasons.map((r, i) => (
                      <p key={i} className="text-xs font-mono text-red-500">{r}</p>
                    ))}
                  </div>
                </>
              )}

              {autoStatus && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auto status</p>
                    {autoStatus.daemon_state && (
                      <Row label="Daemon state">
                        <span className="text-xs font-mono">{autoStatus.daemon_state}</span>
                      </Row>
                    )}
                    {autoStatus.spot != null && (
                      <Row label="Spot">
                        <span className={cn('text-xs font-mono', pnlClass(0))}>{fmtUsd(autoStatus.spot)}</span>
                      </Row>
                    )}
                    {autoStatus.stock_position != null && (
                      <Row label="Stock pos">
                        <span className="text-xs font-mono">{autoStatus.stock_position}</span>
                      </Row>
                    )}
                    {autoStatus.daily_hedge_count != null && (
                      <Row label="Hedges today">
                        <span className="text-xs font-mono">{autoStatus.daily_hedge_count}</span>
                      </Row>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Account Sync Daemon ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LampDot lamp={asdLamp} title={asdTitle} />
            Account Sync Daemon
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {!asd ? 'No heartbeat' : asd.daemon_alive ? 'Running' : 'Not running (heartbeat stale)'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-6">
            {/* Col 1: Heartbeat */}
            <div>
              <HeartbeatGroup
                hb={asd}
                label="Heartbeat"
                countdown={nextAsdHb}
                intervalSec={asIntervalSec}
              />
            </div>

            {/* Col 2: IB Account path */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IB Account Path</p>
              <div className="flex items-center gap-1.5 mb-2">
                <LampDot lamp={ibAccountGroupLamp} title={ibAccountGroupTitle} />
                <span className="text-xs text-muted-foreground">{ibAccountGroupTitle.slice(0, 60)}</span>
              </div>
              <div className="space-y-0 divide-y divide-border rounded border">
                <div className="px-3">
                  <IbServiceRow label="IB Account Agent" svcId="ib_account_agent" status={data} />
                </div>
                <div className="px-3 py-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">PostgreSQL Sync</span>
                    <div className="flex items-center gap-1.5">
                      <LampDot lamp={asdLamp === 'none' ? 'red' : asdLamp} title={asdTitle} />
                      <span className={
                        asdLamp === 'green' ? 'text-green-600 dark:text-green-400'
                        : asdLamp === 'red' ? 'text-red-500'
                        : 'text-yellow-500'
                      }>{asdLamp === 'none' ? 'red' : asdLamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3: Sync details */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sync Counts</p>
              {asd ? (
                <div className="space-y-1">
                  <Row label="Stream lag">
                    <span className={cn('text-xs font-mono', asd.stream_lag > 5 ? 'text-red-500' : 'text-muted-foreground')}>
                      {asd.stream_lag ?? '—'}
                    </span>
                  </Row>
                  <Row label="Sync version">
                    <span className="text-xs font-mono text-muted-foreground">{asd.last_sync_version ?? '—'}</span>
                  </Row>
                  <Separator />
                  <Row label="Accounts">
                    <span className="text-xs font-mono">{asd.accounts_synced ?? '—'}</span>
                  </Row>
                  <Row label="Positions">
                    <span className="text-xs font-mono">{asd.positions_synced ?? '—'}</span>
                  </Row>
                  <Row label="Executions">
                    <span className="text-xs font-mono">{asd.executions_synced ?? '—'}</span>
                  </Row>
                  <Row label="Open orders">
                    <span className="text-xs font-mono">{asd.open_orders_synced ?? '—'}</span>
                  </Row>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Celery ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Celery
            {data?.celery.broker_connected != null && (
              <Badge variant={data.celery.broker_connected ? 'default' : 'destructive'} className="text-[10px] px-1.5">
                {data.celery.broker_connected ? 'Broker OK' : 'Broker Down'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Row label="Workers">
              <span className="font-mono">{data?.celery.workers.length ?? 0}</span>
            </Row>
            <Row label="IB Worker">
              <Badge variant={data?.celery.worker_ib_connected ? 'default' : 'secondary'} className="text-[10px] px-1.5">
                {data?.celery.worker_ib_connected ? 'Connected' : 'Not connected'}
              </Badge>
            </Row>
            {data?.celery.worker_ib_client_id != null && (
              <Row label="IB Client ID">
                <span className="font-mono">{data.celery.worker_ib_client_id}</span>
              </Row>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Recent Operations ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Operations</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-7">Time</TableHead>
                  <TableHead className="h-7">Type</TableHead>
                  <TableHead className="h-7">Side</TableHead>
                  <TableHead className="h-7 text-right">Qty</TableHead>
                  <TableHead className="h-7 text-right">Price</TableHead>
                  <TableHead className="h-7">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                      No recent operations
                    </TableCell>
                  </TableRow>
                ) : (
                  operations.map((op, i) => (
                    <TableRow key={op.daemon_auto_operations_id ?? `op-${op.ts}-${i}`} className="text-xs">
                      <TableCell className="py-1 font-mono">{fmtTs(op.ts)}</TableCell>
                      <TableCell className="py-1">{op.type ?? '—'}</TableCell>
                      <TableCell className="py-1">
                        {op.side
                          ? <Badge variant={op.side === 'Buy' ? 'default' : 'secondary'} className="text-[10px] px-1.5">{op.side}</Badge>
                          : '—'}
                      </TableCell>
                      <TableCell className="py-1 text-right font-mono">{op.quantity ?? '—'}</TableCell>
                      <TableCell className="py-1 text-right font-mono">{op.price != null ? fmtUsd(op.price) : '—'}</TableCell>
                      <TableCell className="py-1 text-muted-foreground">{op.state_reason ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
