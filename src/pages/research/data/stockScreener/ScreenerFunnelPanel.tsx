/**
 * Criteria · Funnel — the prototype's centre column.
 *
 * Seven stages, AND between them, and the count after each. The point of the
 * panel is the *shape of the fall*: a screen that goes 5319 → 1610 → 40 has
 * told you which condition is doing the work, and a list of checkboxes has
 * not.
 *
 * Two of the seven are live here; the other five keep their place and say what
 * is missing. See `screenerFunnel.ts` for what was measured and why each is
 * marked rather than dropped.
 */
import { SECTION_CAP_CLASS } from '@/components/layout'
import { cn } from '@/lib/utils'
import {
  FUNNEL_STAGES,
  chipCount,
  funnelReadings,
  type ConditionCount,
  type StageReading,
} from './screenerFunnel'

export interface FunnelPanelProps {
  universe: number | null
  /** Surviving count per stage id, for the stages that can be counted. */
  stageCounts: Partial<Record<string, number | null>>
  /** Per-condition pass counts, keyed by stage id. */
  chipCounts: Partial<Record<string, readonly ConditionCount[] | null>>
  /** The `min` each stage with a stepper is set to. */
  mins: Record<string, number>
  onMinChange: (stageId: string, next: number) => void
  /** Conditions the reader has picked, by id. */
  active: ReadonlySet<string>
  onToggle: (stageId: string, conditionId: string) => void
  onClearAll: () => void
  loading?: boolean
}

function fmt(n: number | null): string {
  return n == null ? '—' : n.toLocaleString()
}

function StageRow({
  reading,
  chips,
  mins,
  onMinChange,
  active,
  onToggle,
}: {
  reading: StageReading
  chips: readonly ConditionCount[] | null | undefined
  mins: Record<string, number>
  onMinChange: FunnelPanelProps['onMinChange']
  active: ReadonlySet<string>
  onToggle: FunnelPanelProps['onToggle']
}) {
  const { stage } = reading
  const dead = stage.missing != null
  const min = mins[stage.id] ?? stage.min ?? 0
  return (
    <div
      className={cn(
        'grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] gap-2 border-b border-border/60 px-3 py-2.5',
        dead && 'opacity-60',
      )}
    >
      <span className="pt-0.5 font-mono text-dense-meta text-muted-foreground">
        {FUNNEL_STAGES.indexOf(stage) + 1}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-dense-body font-semibold">{stage.title}</span>
          <span className="text-dense-meta text-muted-foreground">{stage.mode}</span>
          {stage.kind === 'min' && !dead ? (
            <span className="ml-auto inline-flex items-center gap-1 text-dense-meta text-muted-foreground">
              min
              <button
                type="button"
                aria-label={`Lower ${stage.title} minimum`}
                className="cursor-pointer px-1 hover:text-foreground disabled:opacity-40"
                disabled={min <= 0}
                onClick={() => onMinChange(stage.id, min - 1)}
              >
                −
              </button>
              <span className="font-mono tabular-nums text-foreground">{min}</span>
              <button
                type="button"
                aria-label={`Raise ${stage.title} minimum`}
                className="cursor-pointer px-1 hover:text-foreground disabled:opacity-40"
                disabled={min >= stage.chips.length}
                onClick={() => onMinChange(stage.id, min + 1)}
              >
                ＋
              </button>
            </span>
          ) : null}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {stage.chips.map((c) => {
            const n = chipCount(chips, c.id)
            const on = active.has(c.id)
            return (
              <button
                key={c.id}
                type="button"
                disabled={dead}
                aria-pressed={on}
                title={
                  dead
                    ? `${c.label} — ${stage.missing}`
                    : n == null
                      ? `${c.label} — nothing counts this condition`
                      : `${c.label} — ${n.toLocaleString()} of the universe pass it`
                }
                onClick={() => onToggle(stage.id, c.id)}
                className={cn(
                  'inline-flex items-baseline gap-1.5 rounded-sm border px-1.5 py-0.5 text-dense-meta',
                  dead
                    ? 'cursor-default border-border/60 text-muted-foreground'
                    : 'cursor-pointer hover:border-foreground/30',
                  on ? 'border-primary/60 bg-primary/10 text-foreground' : 'border-border',
                )}
              >
                <span>{c.label}</span>
                <span className="font-mono text-dense-caption text-muted-foreground">{fmt(n)}</span>
              </button>
            )
          })}
        </div>
        {dead ? (
          <p className="mt-1.5 text-dense-caption leading-relaxed text-muted-foreground">
            {stage.missing}
          </p>
        ) : null}
      </div>
      <div className="text-right">
        <div
          className={cn(
            'font-mono text-sm font-semibold tabular-nums',
            reading.n == null && 'text-muted-foreground',
          )}
        >
          {fmt(reading.n)}
        </div>
        {/* How much of the universe is still standing after this stage. */}
        <span className="mt-1 block h-[5px] overflow-hidden rounded-sm bg-muted">
          {reading.share != null ? (
            <span
              className="block h-full rounded-sm bg-foreground/45"
              style={{ width: `${Math.max(2, reading.share * 100)}%` }}
            />
          ) : null}
        </span>
        <div className="mt-0.5 font-mono text-dense-caption text-muted-foreground">
          {reading.dropped == null ? '—' : `−${reading.dropped.toLocaleString()}`}
        </div>
      </div>
    </div>
  )
}

export function ScreenerFunnelPanel({
  universe,
  stageCounts,
  chipCounts,
  mins,
  onMinChange,
  active,
  onToggle,
  onClearAll,
  loading,
}: FunnelPanelProps) {
  const readings = funnelReadings(universe, stageCounts)
  const counted = readings.map((r) => r.n).filter((n): n is number => n != null)
  const narrowest = counted.length > 0 ? Math.min(...counted) : null
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className={SECTION_CAP_CLASS}>Criteria</span>
        <h2 className="text-dense-body font-semibold">Funnel</h2>
        {/* Not `universe → result`: no cell on this panel is an intersection,
            so the header says what the two numbers are instead of implying
            one ran into the other. */}
        <span className="font-mono text-dense-meta text-muted-foreground">
          {fmt(universe)} universe · narrowest stage{' '}
          <span className="text-foreground">{fmt(narrowest)}</span>
        </span>
        <button
          type="button"
          onClick={onClearAll}
          disabled={active.size === 0}
          className="ml-auto cursor-pointer text-dense-meta text-primary hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
        >
          {active.size === 0 ? 'nothing selected' : `Clear ${active.size}`}
        </button>
      </header>
      {loading ? (
        <p className="px-3 py-6 text-center text-dense-meta text-muted-foreground">
          Counting the universe…
        </p>
      ) : (
        readings.map((r) => (
          <StageRow
            key={r.stage.id}
            reading={r}
            chips={chipCounts[r.stage.id]}
            mins={mins}
            onMinChange={onMinChange}
            active={active}
            onToggle={onToggle}
          />
        ))
      )}
      <p className="px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        Stages are AND. Chips inside a stage are OR unless the stage has a <em>min</em>, then it is
        “at least N of these”. Counts update as you click — no Search step. Each stage's number is
        measured <em>against the universe</em>, not against the stage above it: the running
        intersection is what the applied screen answers, and no cell here claims one nobody
        computed.
      </p>
    </section>
  )
}
