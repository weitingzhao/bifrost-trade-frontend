/**
 * Single trade's head block (design Rev .104): the instance as the Ledger
 * books it — #NNN, the name, its structure and rule, the net (unrealised
 * orange while open) — the seven facts, and the legs table, each leg
 * expandable to its own premium, what was kept and how long it was held. A
 * roll is a seam in one line, not a second trade.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { useOpenInstance } from '@/layout/instanceGo'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd, fmtPct0 } from '@/utils/positions'
import { fmtIsoDateToken } from '@/lib/format'
import type { MarkPath } from '@/utils/reviewMarkPath'
import type { ReviewInstance } from '@/utils/reviewInstances'
import { tradeFactsPath } from '@/components/layout'

const FOOT = 'm-0 border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'
const ORANGE = 'text-[var(--color-unrealized)]'

export function InstanceEconomics({
  inst,
  markPath,
  pathLoading,
  today,
}: {
  inst: ReviewInstance
  markPath: MarkPath | null
  pathLoading: boolean
  today: string
}) {
  const openInstance = useOpenInstance()
  const missing = pathLoading ? '…' : 'n/c'
  const missingSub = pathLoading ? 'reading the legs’ daily bars' : 'no daily bar for this window'
  const net = inst.open && markPath ? markPath.realised : inst.realised
  const netInk = inst.open ? ORANGE : pnlColorClass(net)
  const optLegs = inst.legs.length
  const closedOut = inst.exitPremium
  const credit = inst.shortPremium
  const status = inst.open
    ? `open · day ${inst.daysHeld ?? '—'} of ${inst.dteAtEntry ?? '—'} · unrealised`
    : `${inst.expiredUnbooked ? 'expired · no closing fill' : 'closed'}${inst.rolls ? ` · rolled ${inst.rolls}×` : ''}`
  return (
    <section className={positionsUi.panel} aria-label="What the instance did">
      <header className={positionsUi.panelHead}>
        {inst.instanceId != null ? (
          <button
            type="button"
            onClick={() => openInstance(inst.instanceId!, { from: '/review/fit' })}
            title={`Open instance #${inst.instanceId} beside this page`}
            className="font-mono text-sm font-bold text-[var(--sk-instance)] hover:underline"
          >
            #{inst.instanceId}
          </button>
        ) : (
          <span className="text-dense-meta text-muted-foreground" title="These fills are booked to no instance — reviewed as the contract they traded">
            no instance
          </span>
        )}
        <Link
          to={withSymbolParam(SYMBOL_PATH, inst.underlying)}
          className={cn(positionsUi.mono, 'font-bold text-[var(--sk-ticker)] hover:underline')}
          title={`Open ${inst.underlying} on Symbol`}
        >
          {inst.underlying}
        </Link>
        <span className={cn(positionsUi.mono, 'font-bold text-[var(--sk-contract)]')}>{inst.label}</span>
        <span className="text-dense-meta text-[var(--sk-mute2)]">{inst.play ?? 'no rule recorded'}</span>
        <span className={cn(positionsUi.mono, 'text-sm font-bold', netInk)}>{fmtUsd(net, true)}</span>
        {/covered/i.test(inst.play ?? '') ? (
          <span
            className="text-dense-meta text-warning"
            title="Share legs are never booked to an instance, so the shares this call is written against are not in this line — read the option legs alone."
          >
            shares not in the line
          </span>
        ) : null}
        <span className="ml-auto text-dense-meta text-muted-foreground">{status}</span>
      </header>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.5rem),1fr))] gap-x-4 gap-y-2 px-3 py-2.5">
        <PositionsStat
          cap="Opened"
          value={inst.openedOn ? fmtIsoDateToken(inst.openedOn) : '—'}
          sub={inst.dteAtEntry == null ? 'no expiry read' : `${inst.dteAtEntry} days to expiry`}
        />
        {inst.open ? (
          <PositionsStat cap="As of" value={fmtIsoDateToken(today)} sub={`day ${inst.daysHeld ?? '—'} · still open`} />
        ) : (
          <PositionsStat
            cap="Closed"
            value={inst.closedOn ? fmtIsoDateToken(inst.closedOn) : '—'}
            sub={inst.daysHeld == null ? 'no dated fills' : `held ${inst.daysHeld} days`}
          />
        )}
        <PositionsStat
          cap={credit ? 'Premium in' : 'Paid to open'}
          value={fmtUsd(inst.entryPremium)}
          sub={`${optLegs} option leg${optLegs === 1 ? '' : 's'}${optLegs > 1 ? ' · net' : ''}`}
        />
        <PositionsStat
          cap={credit ? 'Premium out' : 'Received to close'}
          value={fmtUsd(closedOut)}
          sub={
            inst.open
              ? closedOut
                ? 'on legs closed so far'
                : 'nothing closed yet'
              : inst.expiredUnbooked
                ? 'expired — nothing paid'
                : credit
                  ? 'paid to close'
                  : 'received on closing'
          }
        />
        <PositionsStat
          cap="Credit kept"
          value={inst.creditKept == null ? (inst.open ? '—' : 'debit') : fmtPct0(inst.creditKept)}
          ink={inst.creditKept == null ? 'text-muted-foreground' : undefined}
          sub={inst.open ? '1 − exit ÷ entry · at the close' : inst.creditKept == null ? 'no credit was taken in' : '1 − exit ÷ entry'}
        />
        <PositionsStat
          cap={inst.open ? 'Best so far' : 'Best mark'}
          value={markPath == null ? missing : fmtUsd(markPath.best, true)}
          ink={markPath == null ? 'text-muted-foreground' : pnlColorClass(markPath.best)}
          sub={
            markPath == null
              ? missingSub
              : inst.open
                ? `${fmtIsoDateToken(markPath.bestDate)} · to date`
                : `${fmtIsoDateToken(markPath.bestDate)} · landed ${fmtPct0(markPath.captureOfBest)}`
          }
        />
        <PositionsStat
          cap={markPath?.everUnderwater === false ? 'Never underwater' : inst.open ? 'Worst so far' : 'Worst mark'}
          value={markPath == null ? missing : fmtUsd(markPath.worst, true)}
          ink={markPath == null ? 'text-muted-foreground' : pnlColorClass(markPath.worst)}
          sub={
            markPath == null
              ? missingSub
              : markPath.everUnderwater
                ? `${fmtIsoDateToken(markPath.worstDate)} · the risk actually carried`
                : 'no drawdown to sit through'
          }
        />
      </div>
      {/* Rev .110: the legs table is the Facts face's (the Instance page); the
          review keeps the count and the door. */}
      <p className={FOOT}>
        <span className="font-mono text-secondary-foreground">
          {inst.legs.length} {inst.legs.length === 1 ? 'leg' : 'legs'} ·{' '}
          {inst.legs.reduce((n, l) => n + l.fills.length, 0)} fills
        </span>
        {inst.instanceId != null ? (
          <>
            {' · '}
            <Link to={tradeFactsPath(inst.instanceId)} className={positionsUi.link}>
              Facts face →
            </Link>
          </>
        ) : null}
        {' — '}fills-based, fees included, the same figures the{' '}
        <Link to="/portfolio/ledger" className={positionsUi.link}>
          Trade Ledger
        </Link>{' '}
        shows. Share legs are not booked to instances, so a covered call&rsquo;s shares are not in this line.
      </p>
    </section>
  )
}
