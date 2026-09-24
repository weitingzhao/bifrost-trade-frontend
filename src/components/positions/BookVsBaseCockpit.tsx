/**
 * The option book against its base: demand beside supply, and — on Backing &
 * Model — the two gauges that page answers.
 *
 * Positions used to open with this panel and its four gauges. Since design Rev
 * 2026-09-23.21 (§16) the gauges are the page's hero band (`BookHeroBand`) and
 * this panel keeps what the band grades: what the options need and what backs
 * them, each with the arithmetic behind it. Showing both sides is what makes
 * the grade auditable. The gauge words come from `bookGauges`, so the band on
 * Positions and the rows here are one reading, not two.
 *
 * Everything is derived once in usePositionsAlarm. Nothing is recomputed, so a
 * gauge cannot disagree with the tables it summarises.
 */
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ExplanationBlock } from './ExplanationBlock'
import { positionsUi } from './positionsUi'
import { explainBook, type ExplainInputs, type ExplainTopic } from '@/utils/bookExplanations'
import { bookGauges, type GaugeReading } from '@/utils/bookGauges'
import { usdAbbrev } from '@/utils/marginByAccount'
import type { BookVsBase } from '@/utils/bookVsBase'
import type { AlarmTarget } from '@/hooks/usePositionsAlarm'
import type { ObligationsSort } from '@/utils/obligationsRoom'
import type { SpotMix } from '@/utils/spotPrice'
import type { RoomSummary } from '@/utils/roomToAdd'

/** The gauges Backing & Model answers; Pressure and Risk are Positions' questions. */
const BACKING_GAUGES = new Set(['backing', 'potential'])

function GaugeRow({
  gauge,
  onOpen,
  how,
  onHow,
  explanation,
}: {
  gauge: GaugeReading
  /** The section holding this gauge's detail; the name is the way in. */
  onOpen: () => void
  how: ExplainTopic | null
  onHow?: (t: ExplainTopic) => void
  explanation: ReactNode
}) {
  const { name, lit, meter, warn } = gauge
  const litClass = meter || !warn ? 'bg-profit' : 'bg-warning'
  const open = how === gauge.id
  return (
    <div className="border-b border-border/45">
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 leading-normal" title={`${gauge.title}\nClick the name to open the detail.`}>
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
            onClick={() => onHow(gauge.id)}
            aria-pressed={open}
            aria-label={`How ${gauge.id} is computed`}
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
        {/* A graded line reads amber from 3/4; below that it is plain soft ink. A meter never
            warns, and since Rev .21 it reads soft too — the accent is not a reading colour. */}
        <span
          className={cn(
            positionsUi.mono,
            'min-w-0 flex-[1_1_240px] text-xs text-pretty leading-normal',
            warn ? 'text-warning' : 'text-secondary-foreground',
          )}
        >
          {gauge.read}
        </span>
      </div>
      {open ? explanation : null}
    </div>
  )
}

export function BookVsBaseCockpit({
  book,
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
  /** The tightness setting, which the Risk explanation measures the closest leg against. */
  cushionTightPct: number
  onOpenTarget: (t: AlarmTarget, sort?: ObligationsSort) => void
  /**
   * 'full' is Positions' panel under its hero band: demand and supply. 'backing'
   * is the same panel on Backing & Model, with the two gauges that page answers.
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
  const { demand, supply } = book
  const full = variant === 'full'
  const [how, setHow] = useState<ExplainTopic | null>(null)
  const onHow = explain ? (t: ExplainTopic) => setHow((cur) => (cur === t ? null : t)) : undefined
  const explanationFor = (t: ExplainTopic, boxClass?: string) =>
    how === t && explain ? (
      <ExplanationBlock
        explanation={explainBook(t, { ...explain, book, tightPct: cushionTightPct, spotMix })}
        onClose={() => setHow(null)}
        className={boxClass}
      />
    ) : null
  const gauges = full ? [] : bookGauges(book, { tightPct: cushionTightPct, spotMix, room }).filter((g) => BACKING_GAUGES.has(g.id))

  return (
    <section id="positions-cockpit" className={cn(positionsUi.panel, 'flex flex-col', className)} aria-label="Option book against the base">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>{full ? 'Option book against the base' : 'Backing — the options against the base'}</span>
        {headerLink ? (
          <Link to={headerLink.to} className={cn(positionsUi.link, !full && 'ml-auto')}>
            {headerLink.label}
          </Link>
        ) : null}
      </header>

      {gauges.length > 0 ? (
        <div>
          {gauges.map((g) => (
            <GaugeRow
              key={g.id}
              gauge={g}
              onOpen={() => onOpenTarget(g.target.to, g.target.sort)}
              how={how}
              onHow={onHow}
              explanation={explanationFor(g.id)}
            />
          ))}
        </div>
      ) : null}

      {/* flex-1: on a §16.5 band the panel is as tall as its row, and the two cells fill it. */}
      <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,13.125rem),1fr))] gap-px rounded-b-[9px] bg-[var(--sk-line0)]">
        <DemandSupplyCell
          name="Demand — what the options need"
          items={[
            { label: 'Puts need', value: `${usdAbbrev(demand.putCash)} cash`, topic: 'putCash' },
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
              value: `${usdAbbrev(supply.cashLike)}${supply.buyingPower != null ? ` · buying power ${usdAbbrev(supply.buyingPower)}` : ''}`,
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
    <div className="flex min-w-0 flex-col gap-1.5 bg-[var(--sk-raised)] px-3 pt-2 pb-2.5 leading-normal first:rounded-bl-[9px] last:rounded-br-[9px]">
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
