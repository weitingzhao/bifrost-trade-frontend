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
import { postFlatten, postResume, postSuspend } from '@/api/monitor'
import { StatusLamp } from '@/components/StatusLamp'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useCtrlAction } from './useCtrlAction'
import { hedgeFacts, hedgeReading } from './hedgeModel'
import { positionsUi } from '@/components/positions/positionsUi'
import { useDevice } from '@/lib/device'
import { cn } from '@/lib/utils'
import { opsConsoleHref } from '@/lib/opsConsole'
import type { StatusResponse } from '@/types/monitor'

type CtrlRun = ReturnType<typeof useCtrlAction>['run']

/**
 * What the menu holds: the daemon's reading and the three controls. The same
 * rows in the desk's popover and in the phone's sheet (design Rev .163,
 * §18.5): a self-drawn popover anchored to the card's right edge falls off a
 * phone's left edge, and a phone's floats are bottom sheets.
 */
function HedgeControls({
  status,
  run,
  onFlatten,
  readOnly = false,
}: {
  status: StatusResponse | undefined
  run: CtrlRun
  onFlatten: () => void
  /**
   * The phone (Rev .163): the reading and the way to Ops, no write. Flatten is
   * the one button that asks the daemon to trade, and D10 does not extend it
   * to a new device; suspend / resume go with it — a phone that can arm
   * hedging but not stop a flatten is the wrong half of the control.
   */
  readOnly?: boolean
}) {
  const r = hedgeReading(status)
  return (
    <>
      <dl
        aria-label="Hedge daemon reading"
        className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-b border-border px-3 py-2 text-dense-caption"
      >
        {hedgeFacts(status).map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className={cn('m-0 text-right', positionsUi.mono)}>{f.value}</dd>
          </div>
        ))}
      </dl>
      {readOnly ? (
        <p className="m-0 border-b border-border px-3 py-2 text-dense-caption leading-normal text-muted-foreground text-pretty">
          Suspend, resume and emergency flatten are on the iPad and the desk. D10: the phone reads the daemon, it does not
          write to it.
        </p>
      ) : (
      <button
        type="button"
        role="menuitem"
        className="flex h-8 w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 text-left text-dense-meta text-secondary-foreground hover:bg-[var(--sk-surface)] hover:text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground/60"
        disabled={!r.alive}
        onClick={() =>
          void run(r.suspended ? postResume : postSuspend, {
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
      )}
      {/* Rev .48 Q3: the daemon's detail is Ops' Bus Status — the same page
          System › Status's daemon row links to, so the two doors agree. */}
      <a
        href={opsConsoleHref('satellite-bus')}
        target="_blank"
        rel="noreferrer"
        role="menuitem"
        title="Opens Bifröst Ops › Bus Status in a new tab"
        className="flex h-8 w-full items-center gap-2 px-3 text-dense-meta text-secondary-foreground no-underline hover:bg-[var(--sk-surface)] hover:text-foreground"
      >
        Daemon detail ↗<span className="ml-auto text-dense-caption text-muted-foreground">Ops · Bus Status</span>
      </a>
      {readOnly ? null : (
        <>
          <div className="border-t border-border" />
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 text-left text-dense-meta text-danger hover:bg-[var(--sk-surface)]"
            onClick={onFlatten}
          >
            Emergency flatten…
            <span className="ml-auto font-mono text-dense-caption text-muted-foreground">POST /control/flatten</span>
          </button>
        </>
      )}
    </>
  )
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
  const phone = useDevice().device === 'phone'

  useEffect(() => {
    // The confirm renders in a portal, so a click inside it is "outside" this
    // menu. Closing on it would leave the reader with the dialog they opened
    // and no trace of where it came from, and on cancel, nothing at all.
    // A phone's sheet is a portal too, and closes itself (scrim, grip, Esc).
    if (!open || flattenOpen || phone) return
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
  }, [open, flattenOpen, phone])

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
      // The desk's note floats under the button once the menu shuts; a
      // phone's is read in the sheet, so the sheet stays.
      if (!phone) setOpen(false)
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

      {open && !phone ? (
        <div
          role="menu"
          aria-label="Hedging"
          // Rev .142: a self-drawn popover reads the float glass.
          data-glass-surface="raised"
          className="sr-glass-float absolute right-0 top-7 z-45 w-75 overflow-hidden rounded-xl"
        >
          <div className="border-b border-border px-3 py-2 text-dense-meta leading-normal">
            <span className="font-semibold text-foreground">Hedging</span>{' '}
            <span className="text-muted-foreground">· daemon control channel · D10 governs</span>
          </div>
          <HedgeControls status={status} run={ctrl.run} onFlatten={() => setFlattenOpen(true)} />
        </div>
      ) : null}

      {ctrl.msg.text && !phone ? (
        <p
          role="status"
          data-glass-surface={ctrl.msg.isErr ? undefined : 'raised'}
          className={cn(
            'absolute right-0 top-8 z-45 m-0 w-75 rounded-xl px-3 py-2 text-dense-meta leading-normal text-pretty',
            // The error keeps its danger edge (a reading); the plain note floats on glass.
            ctrl.msg.isErr ? 'border border-danger/50 bg-[var(--sk-raised)] text-danger' : 'sr-glass-float text-secondary-foreground',
          )}
        >
          {ctrl.msg.text}
        </p>
      ) : null}

      {phone ? (
        // The flatten confirm is a sheet of its own, so this one steps aside
        // while it is up and comes back when it closes, either way.
        <BottomSheet
          open={open && !flattenOpen}
          onOpenChange={setOpen}
          title="Hedging"
          meta="D10 governs"
          label="Hedging"
          flush
        >
          {ctrl.msg.text ? (
            <p
              role="status"
              className={cn(
                'm-0 border-b border-border px-3 py-2 text-dense-meta leading-normal text-pretty',
                ctrl.msg.isErr ? 'text-danger' : 'text-secondary-foreground',
              )}
            >
              {ctrl.msg.text}
            </p>
          ) : null}
          <div role="menu" aria-label="Hedging">
            <HedgeControls status={status} run={ctrl.run} onFlatten={() => setFlattenOpen(true)} readOnly />
          </div>
        </BottomSheet>
      ) : null}

      <ConfirmDialog
        open={flattenOpen}
        title="Emergency flatten"
        message="Requests the hedge process to flatten all hedge positions on both accounts. This is the one button in Bifrost that asks the daemon to trade."
        bodyExtra={
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 border px-2.5 py-2 text-dense-meta leading-normal mat-card">
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
