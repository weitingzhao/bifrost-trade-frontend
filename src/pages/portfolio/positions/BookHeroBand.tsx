/**
 * Positions' hero band — the first thing on the north-star page (design Rev
 * 2026-09-23.21, §16).
 *
 * The four gauges lifted out of the cockpit panel, not copied: the panel no
 * longer carries them. Each card leads with its one figure, keeps its
 * segments, its score and its `?`, and its name still opens the section that
 * holds the detail. A graded card from three of four lit is outlined and inked
 * amber; Potential is a meter and never is.
 *
 * Under the cards, the checks: firing ones are loud chips with a place to
 * land, the quiet ones sit behind a count. Under those, the How blocks — as
 * many open at once as the reader wants, in gauge order.
 *
 * Every figure is `bookGauges`; every derivation is `explainBook`. The band
 * adds layout, not arithmetic.
 */
import { useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { ExplanationBlock } from '@/components/positions/ExplanationBlock'
import { positionsUi } from '@/components/positions/positionsUi'
import { explainBook, type ExplainInputs } from '@/utils/bookExplanations'
import { bookGauges, type GaugeId, type GaugeReading } from '@/utils/bookGauges'
import type { BookVsBase } from '@/utils/bookVsBase'
import type { AlarmCheck, AlarmTarget } from '@/hooks/usePositionsAlarm'
import type { ObligationsSort } from '@/utils/obligationsRoom'
import type { RoomSummary } from '@/utils/roomToAdd'
import type { SpotMix } from '@/utils/spotPrice'

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
  // Rev .62: no frame — the tone is the ink, and the capsule fills with it.
  const tone = !firing
    ? 'text-muted-foreground/80'
    : QUALITY_CHECKS.has(check.id)
      ? 'text-muted-foreground'
      : 'text-warning'
  return (
    <button
      type="button"
      disabled={!check.target}
      title={check.target ? `${check.detail}\nClick to open the detail.` : check.detail}
      onClick={() => check.target && onOpen(check.target)}
      className={cn(
        'inline-flex h-5 items-center gap-1.25 whitespace-nowrap border mat-tag',
        'text-dense-caption font-semibold uppercase leading-none tracking-[0.04em]',
        check.target ? 'cursor-pointer hover:brightness-125' : 'cursor-default',
        tone
      )}
    >
      {check.label} {check.value}
      {check.target ? (
        <span className="font-mono font-normal opacity-75">→ {TARGET_WORD[check.target]}</span>
      ) : null}
    </button>
  )
}

function HeroCard({
  gauge,
  index,
  how,
  onOpen,
  onHow,
}: {
  gauge: GaugeReading
  index: number
  how: boolean
  onOpen: () => void
  onHow: () => void
}) {
  const { name, lit, meter, warn } = gauge
  const litClass = meter || !warn ? 'bg-profit' : 'bg-warning'
  return (
    // §17.4: the hero card's box and its 30px reading come from
    // `styles/patterns` (data-sr-kpi="hero"); the page gives colour only —
    // so the warning edge is a style, which the shared layer cannot override.
    <div
      data-sr-kpi="hero"
      className="sk-rise sk-lift"
      style={
        {
          '--sk-rise-delay': `${index * 40}ms`,
          ...(warn ? { borderColor: 'color-mix(in srgb, var(--color-warning) 40%, transparent)' } : {}),
        } as CSSProperties
      }
      data-testid={`hero-${gauge.id}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          title={`${gauge.title}\nClick to open the detail.`}
          // The KPI label (Rev .74 §5): 11/600 sentence case, as every hero's.
          data-sr-kpi-l=""
          className="cursor-pointer border-0 bg-transparent p-0 hover:text-foreground hover:underline"
        >
          {name}
        </button>
        <span className="inline-flex w-13 flex-none gap-0.5" aria-label={`${lit} of 4 segments`}>
          {[0, 1, 2, 3].map((i) => (
            <i
              key={i}
              className={cn(
                'block h-1.75 flex-1 rounded-[1px]',
                i < lit ? litClass : 'bg-[var(--sk-surface)]'
              )}
            />
          ))}
        </span>
        <span className={cn(positionsUi.mono, 'text-dense-caption text-muted-foreground')}>
          {lit}/4
        </span>
        <button
          type="button"
          onClick={onHow}
          aria-pressed={how}
          aria-label={`How ${gauge.id} is computed`}
          title={`How ${name.toLowerCase()} is computed`}
          className={cn(positionsUi.q, 'ml-auto', how && 'border-primary text-primary')}
        >
          ?
        </button>
      </div>
      <div data-sr-kpi-v="" className={warn ? 'text-warning' : 'text-foreground'}>
        {gauge.hero}
      </div>
      {/* A sentence, so the body face (Rev .74 §3: mono is for figures). */}
      <div className="type-hero-read text-pretty tabular-nums text-[var(--sk-mute2)]">{gauge.read}</div>
    </div>
  )
}

export function BookHeroBand({
  book,
  checks,
  tightPct,
  spotMix,
  room,
  explain,
  onOpenTarget,
}: {
  book: BookVsBase
  /** All nine checks; the firing ones are chips with a place to land, the quiet ones sit behind a count. */
  checks: AlarmCheck[]
  tightPct: number
  spotMix?: SpotMix
  room?: RoomSummary
  explain: Omit<ExplainInputs, 'book' | 'tightPct' | 'spotMix'>
  onOpenTarget: (t: AlarmTarget, sort?: ObligationsSort) => void
}) {
  const [open, setOpen] = useState<ReadonlySet<GaugeId>>(new Set())
  const [showQuiet, setShowQuiet] = useState(false)
  const gauges = bookGauges(book, { tightPct, spotMix, room })
  const toggle = (id: GaugeId) =>
    setOpen((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const firing = checks.filter((c) => c.tone !== 'ok')
  const quiet = checks.filter((c) => c.tone === 'ok')
  const chips = showQuiet ? [...firing, ...quiet] : firing

  return (
    <section id="positions-readings" aria-label="Book readings" className="@container flex flex-col gap-2.5">
      {/* Four, two by two, or one — never three and one: a reading left alone on a
          row reads as an afterthought. Four columns once each card has its 230px. */}
      <div className="grid grid-cols-1 gap-2.5 @[30rem]:grid-cols-2 @[59.5rem]:grid-cols-4">
        {gauges.map((g, i) => (
          <HeroCard
            key={g.id}
            gauge={g}
            index={i}
            how={open.has(g.id)}
            onOpen={() => onOpenTarget(g.target.to, g.target.sort)}
            onHow={() => toggle(g.id)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span
          className={cn(positionsUi.cap, 'mr-1')}
          title="Only firing checks are loud; quiet ones live behind the count"
        >
          Checks
        </span>
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
      </div>

      {gauges
        .filter((g) => open.has(g.id))
        .map((g) => (
          <ExplanationBlock
            key={g.id}
            explanation={explainBook(g.id, { ...explain, book, tightPct, spotMix })}
            onClose={() => toggle(g.id)}
            className="m-0"
          />
        ))}
    </section>
  )
}
