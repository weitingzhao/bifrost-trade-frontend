/**
 * The first thing on the page: the option book measured against its base.
 *
 * Four gauges, graded 0–3, one line each. They replace the alarm strip and
 * Composition as the opening screen: the strip stated the same facts as chips
 * with no scale, and the donuts answered how capital is allocated, which is a
 * description rather than a state. A seller opening this page wants to know how
 * tight, how backed, how exposed, how much room — and in that order.
 *
 * Below the gauges, demand against supply. The numbers are the same ones the
 * gauges grade; showing both sides is what makes the grade auditable.
 *
 * Everything here is derived once in usePositionsAlarm. Nothing is recomputed,
 * so the gauge cannot disagree with the tables it summarises.
 */
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ExplanationBlock } from './ExplanationBlock'
import { positionsUi } from './positionsUi'
import {
  explainBook,
  litSegments,
  potentialSegments,
  type ExplainInputs,
  type ExplainTopic,
} from '@/utils/bookExplanations'
import { fmtUsd } from '@/utils/positions'
import type { BookVsBase } from '@/utils/bookVsBase'
import type { AlarmCheck, AlarmTarget } from '@/hooks/usePositionsAlarm'
import type { ObligationsSort } from '@/utils/obligationsRoom'
import { fmtSpotDate, type SpotMix } from '@/utils/spotPrice'
import type { RoomSummary } from '@/utils/roomToAdd'

/** Where a chip lands, in the words the prototype prints after its arrow. */
const TARGET_WORD: Record<AlarmTarget, string> = {
  ladder: 'ladder',
  lines: 'lines',
  coverage: 'coverage',
  independent: 'holdings',
  margin: 'margin',
  capital: 'capital',
  room: 'room',
}

/** Data-quality checks qualify the others: grey when they fire, never amber, never red. */
const QUALITY_CHECKS = new Set(['feed', 'unpriced'])

function CheckChip({ check, onOpen }: { check: AlarmCheck; onOpen: (t: AlarmTarget) => void }) {
  const firing = check.tone !== 'ok'
  const tone = !firing
    ? 'border-border text-muted-foreground/80'
    : QUALITY_CHECKS.has(check.id)
      ? 'border-[var(--sk-line2)] text-muted-foreground'
      : 'border-warning/40 bg-warning/10 text-warning'
  return (
    <button
      type="button"
      disabled={!check.target}
      title={check.target ? `${check.detail}\nClick to open the detail.` : check.detail}
      onClick={() => check.target && onOpen(check.target)}
      className={cn(
        'inline-flex h-5 items-center gap-1.25 whitespace-nowrap rounded-[4px] border px-1.75',
        'text-dense-caption font-semibold uppercase leading-none tracking-[0.04em]',
        check.target ? 'cursor-pointer hover:brightness-125' : 'cursor-default',
        tone,
      )}
    >
      {check.label} {check.value}
      {check.target ? <span className="font-mono font-normal opacity-75">→ {TARGET_WORD[check.target]}</span> : null}
    </button>
  )
}

function Gauge({
  name,
  lit,
  meter = false,
  ink,
  title,
  onOpen,
  topic,
  how,
  onHow,
  explanation,
  children,
}: {
  name: string
  /** Segments lit, 0–4. A graded gauge lights level + 1; Potential is a meter. */
  lit: number
  /** Potential measures room, it does not grade danger: its segments stay green. */
  meter?: boolean
  ink: string
  title: string
  /** The section holding this gauge's detail; the name is the way in. */
  onOpen: () => void
  topic: ExplainTopic
  how: ExplainTopic | null
  onHow?: (t: ExplainTopic) => void
  explanation: ReactNode
  children: ReactNode
}) {
  const litClass = meter || lit < 3 ? 'bg-profit' : 'bg-warning'
  const open = how === topic
  return (
    <div className="border-b border-border/45">
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 leading-normal" title={`${title}\nClick the name to open the detail.`}>
        <button
          type="button"
          onClick={onOpen}
          className="min-w-15.5 cursor-pointer border-0 bg-transparent p-0 text-left text-xs font-semibold text-foreground hover:underline leading-normal"
        >
          {name}
        </button>
        {onHow ? (
          <button
            type="button"
            onClick={() => onHow(topic)}
            aria-pressed={open}
            aria-label={`How ${topic} is computed`}
            title={`How ${name.toLowerCase()} is computed`}
            className={cn(positionsUi.q, open && 'border-primary text-primary')}
          >
            ?
          </button>
        ) : null}
        <span className="inline-flex w-13 flex-none gap-0.5" aria-label={`${lit} of 4 segments`}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={cn('block h-1.75 flex-1 rounded-[1px]', i < lit ? litClass : 'bg-[var(--sk-surface)]')} />
          ))}
        </span>
        <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground leading-normal')}>{lit}/4</span>
        <span className={cn(positionsUi.mono, 'min-w-0 flex-[1_1_240px] text-xs text-pretty leading-normal', ink)}>{children}</span>
      </div>
      {open ? explanation : null}
    </div>
  )
}

function pct0(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`
}

function usdK(v: number | null): string {
  if (v == null) return '—'
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return fmtUsd(v)
}

function signedPct1(v: number): string {
  return `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`
}

/** A graded line reads amber from 3/4; below that it is plain soft ink — no colour inside the line. */
function gradedInk(lit: number): string {
  return lit >= 3 ? 'text-warning' : 'text-secondary-foreground'
}

export function BookVsBaseCockpit({
  book,
  checks,
  cushionTightPct,
  onOpenTarget,
  variant = 'full',
  headerLink,
  spotMix,
  explain,
  room,
  className,
}: {
  book: BookVsBase
  /** All nine checks; the firing ones are chips with a place to land, the quiet ones sit behind a count. */
  checks: AlarmCheck[]
  /** The tightness setting, so the Risk line can say how close the closest leg is to it. */
  cushionTightPct: number
  onOpenTarget: (t: AlarmTarget, sort?: ObligationsSort) => void
  /**
   * 'full' is the Positions opening screen. 'backing' is the same block on the
   * Backing page, holding only the two gauges that page answers.
   */
  variant?: 'full' | 'backing'
  /** The other page, one click away. */
  headerLink?: { to: string; label: string }
  /** How the Risk line's underlyings were priced; a mark is not live and says so. */
  spotMix?: SpotMix
  /** The rows behind the totals; when given, every line grows a `?` that opens its arithmetic. */
  explain?: Omit<ExplainInputs, 'book' | 'tightPct' | 'spotMix'>
  /** Room to add in one line; the Potential row shows it and its name opens the section that walks it. */
  room?: RoomSummary
  className?: string
}) {
  const { pressure, backing, risk, potential, demand, supply } = book
  const full = variant === 'full'
  const [how, setHow] = useState<ExplainTopic | null>(null)
  const [showQuiet, setShowQuiet] = useState(false)
  const onHow = explain ? (t: ExplainTopic) => setHow((cur) => (cur === t ? null : t)) : undefined
  const explanationFor = (t: ExplainTopic, boxClass?: string) =>
    how === t && explain ? (
      <ExplanationBlock
        explanation={explainBook(t, { ...explain, book, tightPct: cushionTightPct, spotMix })}
        onClose={() => setHow(null)}
        className={boxClass}
      />
    ) : null

  const firing = full ? checks.filter((c) => c.tone !== 'ok') : []
  const quiet = full ? checks.filter((c) => c.tone === 'ok') : []
  const chips = showQuiet ? [...firing, ...quiet] : firing

  const pressureLit = litSegments(pressure.pct == null ? null : pressure.level)
  const backingLit = litSegments(backing.level)
  const riskLit = litSegments(risk.level)
  const c = risk.counts

  return (
    <section id="positions-cockpit" className={cn(positionsUi.panel, className)} aria-label="Option book against the base">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>{full ? 'Option book against the base' : 'Backing — the options against the base'}</span>
        {headerLink ? (
          <Link to={headerLink.to} className={cn(positionsUi.link, !full && 'ml-auto')}>
            {headerLink.label}
          </Link>
        ) : null}
        {full ? (
          <span className="ml-auto flex flex-wrap items-center justify-end gap-1">
            {chips.map((ch) => (
              <CheckChip key={ch.id} check={ch} onOpen={(t) => onOpenTarget(t)} />
            ))}
            {quiet.length > 0 ? (
              <button
                type="button"
                className={cn(positionsUi.btn, 'h-5 text-dense-caption leading-normal')}
                onClick={() => setShowQuiet((v) => !v)}
                aria-expanded={showQuiet}
                title="Checks that are not firing"
              >
                {showQuiet ? `hide ${quiet.length} quiet` : `${quiet.length} quiet checks`}
              </button>
            ) : null}
          </span>
        ) : null}
      </header>

      <div>
        {full ? (
          <Gauge
            name="Pressure"
            lit={pressureLit}
            ink={gradedInk(pressureLit)}
            onOpen={() => onOpenTarget('margin')}
            topic="pressure"
            how={how}
            onHow={onHow}
            explanation={explanationFor('pressure')}
            title="1 − the broker's own Cushion. At 100% excess liquidity is gone and it starts closing positions; level 3 begins at 75%."
          >
            {pct0(pressure.pct)} used · cushion {pct0(pressure.cushion)} · liquidation at 100%
          </Gauge>
        ) : null}

        <Gauge
          name="Backing"
          lit={backingLit}
          ink={gradedInk(backingLit)}
          onOpen={() => onOpenTarget('coverage', 'cash')}
          topic="backing"
          how={how}
          onHow={onHow}
          explanation={explanationFor('backing')}
          title="What the options need against what actually backs them. Any naked call is level 2; puts leaning on margin rather than cash is level 1."
        >
          {backing.callsCovered}/{backing.callsTotal} calls covered
          {backing.nakedCalls > 0 ? ` · ${backing.nakedCalls} naked` : ''}
          {backing.putCashNeeded > 0 ? ` · puts ${usdK(backing.putCashNeeded)} vs cash ${usdK(backing.cashLike)}` : ''}
        </Gauge>

        {full ? (
          <Gauge
            name="Risk"
            lit={riskLit}
            ink={gradedInk(riskLit)}
            onOpen={() => onOpenTarget('ladder')}
            topic="risk"
            how={how}
            onHow={onHow}
            explanation={explanationFor('risk')}
            title="Short legs already past their strike, or expiring within a week. Unpriced legs are excluded from both counts and are not known to be safe."
          >
            {c.itm} ITM · {c.near7d} ≤7d
            {c.zeroDte > 0 ? ` · ${c.zeroDte} today` : ''}
            {c.unpriced > 0 ? ` · ${c.unpriced} unpriced` : ''}
            {spotMix && spotMix.close > 0 ? ` · ${spotMix.close} at close ${fmtSpotDate(spotMix.oldestCloseAsOf, 'close')}` : ''}
            {spotMix && spotMix.mark > 0 ? ` · ${spotMix.mark} at mark ${fmtSpotDate(spotMix.oldestMarkAsOf)}` : ''}
            {' · '}
            {c.tightest == null
              ? 'tightest n/a'
              : `tightest ${signedPct1(c.tightest)} vs ${Math.round(cushionTightPct * 100)}%`}
          </Gauge>
        ) : null}

        <Gauge
          name="Potential"
          lit={potentialSegments(book)}
          meter
          ink="text-primary"
          onOpen={() => onOpenTarget('room')}
          topic="potential"
          how={how}
          onHow={onHow}
          explanation={explanationFor('potential')}
          title="Room to add: what the free base still backs, what margin adds up to your ceiling, and what the book decays by a day. A meter, not a warning: the segments are the share of held shares still free."
        >
          {room
            ? `Room +${room.calls} calls · ${room.puts == null ? '—' : `+${room.puts}`} puts backed · ${
                room.marginPuts == null ? '—' : `+${room.marginPuts}`
              } on margin to ${Math.round(room.ceiling * 100)}%`
            : `${potential.moreCalls} more calls · ${potential.sharesFree.toLocaleString()} free sh`}
          {potential.thetaPerDay != null
            ? ` · θ ${potential.thetaPerDay >= 0 ? '+' : '−'}${fmtUsd(Math.abs(potential.thetaPerDay), true)}/d`
            : ''}
        </Gauge>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.125rem),1fr))] gap-px rounded-b-md bg-border">
        <DemandSupplyCell
          name="Demand — what the options need"
          items={[
            { label: 'Puts need', value: `${usdK(demand.putCash)} cash`, topic: 'putCash' },
            { label: 'Calls need', value: `${demand.callShares.toLocaleString()} shares`, topic: 'callShares' },
          ]}
          how={how}
          onHow={onHow}
          explanationFor={explanationFor}
        />
        <DemandSupplyCell
          name="Supply — what backs them"
          items={[
            {
              label: 'Cash and SGOV',
              value: `${usdK(supply.cashLike)}${supply.buyingPower != null ? ` · buying power ${usdK(supply.buyingPower)}` : ''}`,
              topic: 'cashLike',
            },
            {
              label: 'Held',
              value: `${supply.sharesHeld.toLocaleString()} · free ${supply.sharesFree.toLocaleString()}`,
              topic: 'shares',
            },
          ]}
          how={how}
          onHow={onHow}
          explanationFor={explanationFor}
        />
      </div>
    </section>
  )
}

function DemandSupplyCell({
  name,
  items,
  how,
  onHow,
  explanationFor,
}: {
  name: string
  items: { label: string; value: string; topic: ExplainTopic }[]
  how: ExplainTopic | null
  onHow?: (t: ExplainTopic) => void
  explanationFor: (t: ExplainTopic, boxClass?: string) => ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-[var(--sk-raised)] px-3 pt-2 pb-2.5 leading-normal first:rounded-bl-md last:rounded-br-md">
      <span className={positionsUi.cap}>{name}</span>
      {items.map((it) => (
        <div key={it.topic} className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-xs text-secondary-foreground leading-normal">{it.label}</span>
            <span className={cn(positionsUi.mono, 'text-xs font-semibold text-foreground leading-normal')}>{it.value}</span>
            {onHow ? (
              <button
                type="button"
                onClick={() => onHow(it.topic)}
                aria-pressed={how === it.topic}
                aria-label={`How ${it.topic} is computed`}
                title={`How ${it.label.toLowerCase()} is built`}
                className={cn(positionsUi.q, 'self-center', how === it.topic && 'border-primary text-primary')}
              >
                ?
              </button>
            ) : null}
          </span>
          {explanationFor(it.topic, 'mx-0 mt-1 mb-0.5')}
        </div>
      ))}
    </div>
  )
}
