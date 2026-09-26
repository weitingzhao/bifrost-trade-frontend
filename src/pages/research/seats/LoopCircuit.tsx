/**
 * The loop drawn as a circuit — Research's opening panel (design Rev 2026-09-20.23).
 *
 * It replaces the six-station *table*: same six stations and the same
 * per-operator counts, laid out as the circuit they are. Top row runs
 * 01→03 left to right, the bottom row comes back 06→05→04, and the violet
 * column on the left is the return edge — the same edge the sidebar spine
 * draws as `↺ 5 → 1`. Two stations cross the outer loop: a settlement is
 * money in Portfolio, a verdict is a judgment in Review.
 *
 * The machines band sits inside the circuit because that is what it says:
 * objectives run laps around these stations on a schedule, and your hand runs
 * the same stations without one.
 *
 * `⧉` marks a page with a Method face and is read from the design's own FACES
 * table (`lib/design/faces`), never listed here — a hand-kept copy of a
 * pairing is the thing that drifts when the design moves a page.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { hasMethodFace } from '@/lib/design/faces'
import { PAGE_ROUTES } from '@/layout/routeRegistry'
import type { LoopCard, LoopPage } from './overviewModel'

/** Objectives, as the band prints them. */
export interface MachineChip {
  id: string
  name: string
  state: string
  meta: string
  tip: string
  /** The lamp/dot tone class — the objective's own state colour. */
  tone: string
}

const BUILT = new Set(PAGE_ROUTES.map((r) => r.path))

const CROSS_INK = 'text-[var(--color-entity-strategy)]'

function PageChip({ page }: { page: LoopPage }) {
  const mark = hasMethodFace(page.to) ? ' ⧉' : ''
  const label = `${page.label}${mark}`
  const tip = hasMethodFace(page.to)
    ? `${page.tip} ⧉ it has a Method face.`
    : page.tip
  // Never a link to a route nobody serves: the design's Judge station carries
  // Compare and History, which it has prototypes for and this side has not
  // built. The chip keeps its place and says so rather than disappearing —
  // the station writes at four pages whether or not two of them exist here.
  if (!BUILT.has(page.to)) {
    return (
      <span
        className="inline-flex h-5 cursor-default items-center rounded border border-dashed border-border/60 px-1.5 text-dense-caption text-muted-foreground/60"
        title={`${tip} — not built on this side yet.`}
      >
        {label}
      </span>
    )
  }
  return (
    <Link
      to={page.to}
      title={tip}
      className="inline-flex h-5 items-center border px-1.5 text-dense-caption text-muted-foreground hover:text-foreground mat-btn"
    >
      {label}
    </Link>
  )
}

function StationCard({ card }: { card: LoopCard }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1.5 rounded-md border bg-card px-2.5 py-2',
        card.crossNote ? 'border-[var(--color-entity-strategy)]/40' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-dense-micro text-muted-foreground">{card.n}</span>
        <span className="text-dense-label font-semibold">{card.name}</span>
        <span
          className="ml-auto font-mono text-dense-micro text-muted-foreground"
          title={card.countsTip}
        >
          {card.counts}
        </span>
      </div>
      <div className="text-dense-caption text-muted-foreground">
        writes <span className="font-mono text-foreground/70">{card.produces}</span>
        {card.crossNote ? (
          <span className={CROSS_INK}> · crosses the outer loop: {card.crossNote}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {card.pages.map((p) => (
          <PageChip key={`${card.n}-${p.label}`} page={p} />
        ))}
      </div>
    </div>
  )
}

function Arrow({ glyph }: { glyph: '→' | '←' }) {
  return (
    <div className="flex items-center justify-center text-dense-body text-border" aria-hidden>
      {glyph}
    </div>
  )
}

export function LoopCircuit({ cards, machines }: { cards: LoopCard[]; machines: MachineChip[] }) {
  const top = cards.filter((c) => c.row === 'top')
  const bottom = cards.filter((c) => c.row === 'bottom')
  return (
    <section className="overflow-hidden border mat-card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary px-3 py-2">
        <span className="text-dense-meta font-semibold text-muted-foreground">
          The loop
        </span>
        <span className="text-dense-body font-semibold">
          Six stations · today’s artifacts by operator
        </span>
        <span className="ml-auto text-dense-meta text-muted-foreground">
          h / l / c = your hand · the loop · the Copilot — three operators, one pipeline · ⧉ = the
          page has a Method face
        </span>
      </header>

      <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)_1.25rem_minmax(0,1fr)]">
        {top.map((c, i) => (
          <div key={c.n} className="contents">
            <StationCard card={c} />
            {i < top.length - 1 ? <Arrow glyph="→" /> : null}
          </div>
        ))}

        {/* The return edge and the machines band share the middle row: the
            edge is what closes the circuit, the band is who runs laps on it. */}
        <div
          className={cn('hidden flex-col items-center justify-center gap-1 md:flex', CROSS_INK)}
          title="The return edge — what settles changes what you look for. The same edge the sidebar footer draws as ↺ 5 → 1."
        >
          <span aria-hidden>↑</span>
          <span className="font-mono text-dense-micro [writing-mode:vertical-rl] [transform:rotate(180deg)]">
            the return edge
          </span>
          <span aria-hidden>↑</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 border px-3 py-2 md:col-span-3 mat-card">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-dense-meta font-semibold text-muted-foreground">
              The machines
            </span>
            <span className="text-dense-meta text-muted-foreground">
              objectives run laps around this loop on a schedule; your hand runs the same stations
              without one
            </span>
            <Link
              to="/research/loop/harness"
              className="ml-auto text-dense-meta text-primary hover:underline"
            >
              Console →
            </Link>
            <Link
              to="/review/objectives"
              className={cn('text-dense-meta hover:underline', CROSS_INK)}
            >
              Their verdicts →
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {machines.length === 0 ? (
              <span className="text-dense-meta text-muted-foreground/70">
                No objective is running — the stations below are all your hand today.
              </span>
            ) : (
              machines.map((m) => (
                <Link
                  key={m.id}
                  to={`/research/loop/objectives/${m.id}`}
                  title={m.tip}
                  className="inline-flex min-w-0 items-baseline gap-1.5 border px-2 py-1 mat-btn"
                >
                  <span
                    className={cn('size-1.5 shrink-0 self-center rounded-full', m.tone)}
                    aria-hidden
                  />
                  <span className="whitespace-nowrap text-dense-meta font-semibold">{m.name}</span>
                  <span className="whitespace-nowrap font-mono text-dense-micro text-muted-foreground">
                    {m.state}
                  </span>
                  <span className="whitespace-nowrap font-mono text-dense-micro text-muted-foreground/70">
                    {m.meta}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
        <div
          className="hidden items-center justify-center text-dense-body text-border md:flex"
          title="Judge hands to Decide."
          aria-hidden
        >
          ↓
        </div>

        {bottom.map((c, i) => (
          <div key={c.n} className="contents">
            <StationCard card={c} />
            {i < bottom.length - 1 ? <Arrow glyph="←" /> : null}
          </div>
        ))}
      </div>

      <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        Settle and Feed back cross the outer loop — a settlement is money in{' '}
        <Link to="/portfolio/outcome" className="text-primary hover:underline">
          Portfolio
        </Link>
        , a verdict is a judgment in{' '}
        <Link to="/review/objectives" className={cn('hover:underline', CROSS_INK)}>
          Review
        </Link>{' '}
        — which is why the sidebar spine ends in{' '}
        <span className={cn('font-mono', CROSS_INK)}>↺ 5 → 1</span>, not a full stop.
      </p>
    </section>
  )
}
