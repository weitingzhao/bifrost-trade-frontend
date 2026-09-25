/**
 * Habits' right-hand column: where the book sits on the 2×2, how its cost
 * splits between discipline and the plans themselves, and what the page
 * refuses to say.
 *
 * The first two both divide by the plan, so both keep their designed shape and
 * carry a marker instead of a number. The split in particular must not be
 * halved and shown: "how much of what this book lost was behaviour and how
 * much was the plan" is the single most consequential figure in the group, and
 * an estimate of it would be acted on.
 */
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { REVIEW_UNRECORDED } from '@/utils/reviewTrades'

const QUADRANTS = [
  { key: 'good-followed', name: 'Good plan · followed' },
  { key: 'good-broke', name: 'Good plan · broke it' },
  { key: 'weak-followed', name: 'Weak plan · followed' },
  { key: 'weak-broke', name: 'Weak plan · broke it' },
] as const

export function PlanAdherenceQuadrants({ closed }: { closed: number }) {
  return (
    <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Plan × adherence">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Plan × adherence</span>
        <span className={positionsUi.panelTitle}>Where the book sits</span>
        <span className="ml-auto">
          <DenseTag variant="warning" size="cell">
            ⚠ NO PLAN
          </DenseTag>
        </span>
      </header>
      <div className="grid grid-cols-2 gap-2 px-3 py-2.5">
        {QUADRANTS.map((q) => (
          <div key={q.key} className="min-w-0 border px-2.5 py-2 mat-card">
            <div className="flex items-baseline gap-1.5">
              <span className="min-w-0 text-dense-meta leading-tight font-semibold text-muted-foreground">
                {q.name}
              </span>
              <span className={cn(positionsUi.mono, 'ml-auto text-dense-meta text-muted-foreground')}>—</span>
            </div>
            <div className={cn(positionsUi.mono, 'pt-0.5 text-sm font-semibold text-muted-foreground')}>n/c</div>
          </div>
        ))}
      </div>
      <p className="m-0 border-t border-border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
        Both axes are the plan: whether it was any good, and whether it was followed. All {closed} closed trades sit
        outside the grid rather than being spread across it — a book placed in four boxes by guesswork would be the
        most confident thing on this page and the least supported.
      </p>
    </section>
  )
}

export function CostSplit() {
  return (
    <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Split">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Split</span>
        <span className={positionsUi.panelTitle}>Discipline vs plan, for the book</span>
        <span className="ml-auto">
          <DenseTag variant="warning" size="cell">
            ⚠ NO PLAN
          </DenseTag>
        </span>
      </header>
      <div className="flex flex-col gap-2.5 px-3 py-2.5">
        {['Cost of not following my plans', 'Cost built into the plans themselves'].map((label) => (
          <div key={label}>
            <div className="flex items-baseline gap-2">
              <span className="text-dense-body text-secondary-foreground">{label}</span>
              <span className={cn(positionsUi.mono, 'ml-auto text-sm font-semibold text-muted-foreground')}>n/c</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--sk-surface)]" />
          </div>
        ))}
        <p className="m-0 inline-flex items-start gap-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
          <span className="pt-1">
            <StatusLamp lamp="gray" variant="dot" title="Missing" />
          </span>
          <span>
            Both halves subtract from the plan&rsquo;s own exit, so neither is a number here. This is the split the
            whole group exists to produce, and it is the one thing a linked plan would unlock outright.
          </span>
        </p>
      </div>
    </section>
  )
}

export function NotClaimed({
  measured,
  total,
  closed,
  withoutPath,
  pathRequests,
}: {
  measured: number
  total: number
  closed: number
  withoutPath: number
  pathRequests: number
}) {
  const rows = [
    {
      key: 'plan',
      lamp: 'gray' as const,
      title: 'That any of this was against a plan',
      sub: REVIEW_UNRECORDED.plan,
    },
    {
      key: 'path',
      lamp: withoutPath === 0 ? ('green' as const) : ('yellow' as const),
      title:
        withoutPath === 0
          ? `That a path is missing · all ${closed} closed trades have one`
          : `That every trade has a path · ${withoutPath} of ${closed} do not`,
      sub:
        withoutPath === 0
          ? `Read from market.option_daily over ${pathRequests} requests, one per underlying and expiry. The best mark, the worst mark and the give-back are measured, not estimated.`
          : `Those ${withoutPath} are excluded from every path habit rather than counted at zero — a trade with no bars is not a trade that never moved.`,
    },
    {
      key: 'cost',
      lamp: 'yellow' as const,
      title: `That ${total - measured} of the ${total} tendencies have a reading`,
      sub: 'They keep their rows and name what they need. A habit with no sample invites a rule change argued from nothing, which is worse than an empty page.',
    },
    {
      key: 'archetype',
      lamp: 'gray' as const,
      title: 'That any of it makes me a type of trader',
      sub: 'The design is explicit: no scores and no archetypes, because a label that cannot be falsified is not a finding.',
    },
  ]

  return (
    <section className={positionsUi.panel} aria-label="Not claimed">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Not claimed</span>
        <span className={positionsUi.panelTitle}>What this page refuses to say</span>
      </header>
      <div className="flex flex-col">
        {rows.map((r) => (
          <div
            key={r.key}
            className="grid grid-cols-[0.75rem_minmax(0,1fr)] items-start gap-2.5 border-b border-border/55 px-3 py-1.75 last:border-b-0"
          >
            <span className="pt-1">
              <StatusLamp lamp={r.lamp} variant="dot" title={r.title} />
            </span>
            <span className="min-w-0">
              <span className="block text-dense-body text-foreground">{r.title}</span>
              <span className="block pt-0.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
                {r.sub}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
