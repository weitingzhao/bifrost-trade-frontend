/**
 * Hedging — the daemon's only write control, and the one button in Bifrost
 * that asks it to trade.
 *
 * These three actions have existed for a long time. They started on the Daemon
 * page under System, moved to Strategy › Instances because suspending hedging
 * is a trading decision rather than daemon telemetry, and the design puts them
 * here (Trade Desk header menu, `D10 · owner-only`). This is that move and
 * nothing more: the same three endpoints, the same consumer, the same
 * semantics. **No new capability is armed by this file.**
 *
 * What is added is the acknowledgement the design asks for on flatten. It is
 * not ceremony: the other two actions change what the daemon will do next, and
 * this one asks it to act in the market now, so it is the only one that cannot
 * be undone from here.
 *
 * D10 governs all three. The freeze is held by the spine and by the
 * `daemon-scale-zero` / `daemon-observe-safe` overlays, never by whether a
 * button is drawn — which is why hiding it would buy nothing and cost the
 * Owner the control they may actually need.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { postFlatten, postResume, postSuspend } from '@/api/monitor'
import { StatusLamp } from '@/components/StatusLamp'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useCtrlAction } from '@/pages/system/daemon/daemonShared'
import { positionsUi } from '@/components/positions/positionsUi'
import { cn } from '@/lib/utils'
import type { StatusResponse } from '@/types/monitor'

export interface HedgeReading {
  suspended: boolean
  alive: boolean
  /** What the daemon calls itself — `running_suspended`, `BOOT`, … */
  state: string | null
  paperTrade: boolean | null
}

/** The daemon's own words, read once so the menu and the strip agree. */
export function hedgeReading(status: StatusResponse | undefined): HedgeReading {
  const auto = status?.daemon?.trading?.auto_status as Record<string, unknown> | undefined
  const summary = typeof auto?.config_summary === 'string' ? auto.config_summary : null
  return {
    suspended: status?.daemon?.trading?.trading_suspended ?? false,
    alive: status?.daemon?.heartbeat?.daemon_alive ?? false,
    state: typeof auto?.daemon_state === 'string' ? auto.daemon_state : null,
    paperTrade: summary == null ? null : /paper_trade\s*=\s*true/i.test(summary),
  }
}

export function HedgeMenu({
  status,
  onChanged,
}: {
  status: StatusResponse | undefined
  onChanged: () => void
}) {
  const r = hedgeReading(status)
  const [open, setOpen] = useState(false)
  const [flattenOpen, setFlattenOpen] = useState(false)
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const ctrl = useCtrlAction(onChanged)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // The confirm renders in a portal, so a click inside it is "outside" this
    // menu. Closing on it would leave the reader with the dialog they opened
    // and no trace of where it came from, and on cancel, nothing at all.
    if (!open || flattenOpen) return
    const away = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open, flattenOpen])

  // §11.3.1: no reading is grey, never red. A daemon that is not running is
  // not a fault of the hedge — it is the absence of one.
  const lamp = !r.alive ? 'gray' : r.suspended ? 'yellow' : 'green'
  const label = !r.alive ? 'not running' : r.suspended ? 'suspended' : 'enabled'

  async function flatten() {
    setBusy(true)
    try {
      await ctrl.run(postFlatten, {
        loading: 'Requesting flatten…',
        success: 'Flatten sent — the hedge process consumes it on its next heartbeat. Watch Orders & Fills.',
      })
      setFlattenOpen(false)
      setAck(false)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex-none" ref={wrap}>
      <button
        type="button"
        className={cn(positionsUi.btn, 'h-6')}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Hedging — the daemon’s only write control"
      >
        <StatusLamp lamp={lamp} variant="dot" />
        <span>Hedge {label}</span>
        <span className="text-muted-foreground">▾</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Hedging"
          className="absolute right-0 top-7 z-45 w-75 overflow-hidden rounded-lg border border-[var(--sk-line2)] bg-[var(--sk-raised)] shadow-[0_24px_60px_-20px_#000]"
        >
          <div className="border-b border-border px-3 py-2 text-dense-meta leading-normal">
            <span className="font-semibold text-foreground">Hedging</span>{' '}
            <span className="text-muted-foreground">· daemon control channel · D10 governs</span>
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex h-8 w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 text-left text-dense-meta text-secondary-foreground hover:bg-[var(--sk-surface)] hover:text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground/60"
            disabled={!r.alive}
            onClick={() =>
              void ctrl.run(r.suspended ? postResume : postSuspend, {
                loading: r.suspended ? 'Setting resume…' : 'Setting suspend…',
                success: r.suspended
                  ? 'Resume set — the daemon resumes hedging on its next heartbeat.'
                  : 'Suspend set — the daemon pauses hedging on its next heartbeat.',
              })
            }
          >
            {r.suspended ? 'Resume hedging' : 'Suspend hedging'}
            <span className="ml-auto text-dense-caption text-muted-foreground">
              {r.alive ? 'takes effect next heartbeat' : 'daemon is not running'}
            </span>
          </button>
          <Link
            to="/system/daemon"
            role="menuitem"
            className="flex h-8 w-full items-center gap-2 px-3 text-dense-meta text-secondary-foreground no-underline hover:bg-[var(--sk-surface)] hover:text-foreground"
          >
            Daemon status →<span className="ml-auto text-dense-caption text-muted-foreground">System › Status</span>
          </Link>
          <div className="border-t border-border" />
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 text-left text-dense-meta text-danger hover:bg-[var(--sk-surface)]"
            onClick={() => setFlattenOpen(true)}
          >
            Emergency flatten…
            <span className="ml-auto font-mono text-dense-caption text-muted-foreground">POST /control/flatten</span>
          </button>
        </div>
      ) : null}

      {ctrl.msg.text ? (
        <p
          role="status"
          className={cn(
            'absolute right-0 top-8 z-45 m-0 w-75 rounded-md border bg-[var(--sk-raised)] px-3 py-2 text-dense-meta leading-normal text-pretty',
            ctrl.msg.isErr ? 'border-danger/50 text-danger' : 'border-border text-secondary-foreground',
          )}
        >
          {ctrl.msg.text}
        </p>
      ) : null}

      <ConfirmDialog
        open={flattenOpen}
        title="Emergency flatten"
        message="Requests the hedge process to flatten all hedge positions on both accounts. This is the one button in Bifrost that asks the daemon to trade."
        bodyExtra={
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 rounded-md border border-border bg-[var(--sk-raised2)] px-2.5 py-2 text-dense-meta leading-normal">
              <span className="flex justify-between gap-2">
                <span className="text-muted-foreground">Sends</span>
                <span className={positionsUi.mono}>POST /control/flatten</span>
              </span>
              <span className="flex justify-between gap-2">
                <span className="text-muted-foreground">Consumer</span>
                <span>hedge process · next heartbeat</span>
              </span>
              <span className="flex justify-between gap-2">
                <span className="text-muted-foreground">Daemon</span>
                <span>
                  {r.alive ? (r.state ?? 'alive') : 'not running'}
                  {r.paperTrade == null ? '' : r.paperTrade ? ' · paper_trade' : ' · live'}
                </span>
              </span>
              <span className="flex justify-between gap-2">
                <span className="text-muted-foreground">Freeze</span>
                <span>D10 · owner-only</span>
              </span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-dense-meta leading-normal text-pretty">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                aria-label="Acknowledge that flatten executes in the market"
              />
              <span>I understand this executes in the market and cannot be undone from here.</span>
            </label>
          </div>
        }
        confirmLabel="Send flatten"
        confirming={busy}
        confirmDisabled={!ack}
        onConfirm={() => void flatten()}
        onCancel={() => {
          setFlattenOpen(false)
          setAck(false)
        }}
      />
    </div>
  )
}
