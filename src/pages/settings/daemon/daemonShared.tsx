import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { StatusLamp } from '@/components/StatusLamp'
import { DenseTag } from '@/components/data-display'
import type { DaemonHeartbeat } from '@/types/monitor'
import { ibServiceLamp, type DaemonLamp } from '@/utils/daemonLamps'
import {
  daemonGroupTitleClass,
  daemonIbServiceListClass,
  daemonIbServiceRowClass,
  daemonIbServiceRowInnerClass,
  daemonKvLabelClass,
  daemonKvRowClass,
  daemonKvValueClass,
  daemonLampTextClass,
} from './daemonUi'

// ── Helpers ───────────────────────────────────────────────────────────────────

export function fmtTs(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleString()
}

export function fmtUsd(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(daemonKvRowClass, className)}>
      <span className={daemonKvLabelClass}>{label}</span>
      <span className={daemonKvValueClass}>{children}</span>
    </div>
  )
}

export function LampDot({ lamp, title }: { lamp: DaemonLamp; title?: string }) {
  const mapped = lamp === 'none' ? 'red' : lamp
  return <StatusLamp lamp={mapped} title={title} className="h-2.5 w-2.5 shrink-0" />
}

export function IbServiceRow({ label, svcId, status }: {
  label: string
  svcId: 'ib_operator' | 'ib_ingestor' | 'ib_account_agent'
  status: import('@/types/monitor').StatusResponse | undefined
}) {
  const { lamp, title } = ibServiceLamp(svcId, status ?? null)
  return (
    <div className={daemonIbServiceRowClass}>
      <span className={daemonKvLabelClass}>{label}</span>
      <div className={daemonIbServiceRowInnerClass}>
        <LampDot lamp={lamp} title={title} />
        <span className={daemonLampTextClass(lamp)}>{lamp}</span>
      </div>
    </div>
  )
}

export function HeartbeatGroup({
  hb, label, countdown, intervalSec, staleHint,
}: {
  hb: DaemonHeartbeat | { last_ts: number | null; daemon_alive: boolean; heartbeat_interval_sec: number; graceful_shutdown_at?: number | null } | null | undefined
  label: string
  countdown: number | null
  intervalSec: number
  staleHint?: string
}) {
  return (
    <div className="space-y-2">
      <p className={daemonGroupTitleClass}>{label}</p>
      {hb == null ? (
        <p className="text-xs text-muted-foreground">No heartbeat data</p>
      ) : (
        <div className="space-y-1">
          <Row label="Last heartbeat">
            <span>{fmtTs(hb.last_ts)}</span>
          </Row>
          {staleHint && (
            <p className="text-xs text-muted-foreground">{staleHint}</p>
          )}
          {hb.daemon_alive && countdown != null && (
            <Row label="Next heartbeat">
              <span>{countdown}s</span>
            </Row>
          )}
          <Row label="Interval">
            <span>{intervalSec}s</span>
          </Row>
        </div>
      )}
    </div>
  )
}

export function ConnectionTag({ connected }: { connected: boolean }) {
  return (
    <DenseTag variant={connected ? 'success' : 'danger'} size="cell">
      {connected ? 'Yes' : 'No'}
    </DenseTag>
  )
}

export { daemonIbServiceListClass }

// ── Control action hook ───────────────────────────────────────────────────────

type CtrlMsg = { text: string; isErr: boolean }

export function useCtrlAction(onSuccess?: () => void) {
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
