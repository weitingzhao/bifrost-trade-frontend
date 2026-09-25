/**
 * Criteria · Funnel — the prototype's centre column.
 *
 * Seven stages, AND between them, and the count after each. The point of the
 * panel is the *shape of the fall*: a screen that goes 5319 → 1610 → 40 has
 * told you which condition is doing the work, and a list of checkboxes has
 * not.
 *
 * Three of the seven are live here and Catalyst is half live; the rest keep
 * their place and say what is missing. See `screenerFunnel.ts` for what was
 * measured and why each is marked rather than dropped.
 *
 * Catalyst's four SEC 8-K chips are the narrative column (Rev .43): dashed and
 * prefixed so they read as their own kind, counted like any chip, and never
 * enough on their own to start a screen.
 */
import { SECTION_CAP_CLASS } from '@/components/layout'
import { cn } from '@/lib/utils'
import {
  FUNNEL_STAGES,
  chipCount,
  funnelReadings,
  type ConditionCount,
  type FunnelChip,
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
  /**
   * Run the selection and put the names in Results.
   *
   * The prototype has no Search step because its counts *are* the set. Here
   * the counts come from one cheap endpoint and the set comes from another,
   * so the step stays — but it belongs in this panel, beside what it acts on.
   * The first pass of this walk left it at the foot of the page, which made
   * the loop unusable: you picked conditions at the top and the control that
   * did anything with them was off-screen.
   */
  onRun?: () => void
  runBusy?: boolean
  /** What the last run put in Results, when it has run. */
  ranCount?: number | null
  /**
   * Why Run is refused although something is picked — a screen of narrative
   * conditions alone (a nomination needs one measured condition, Narrative
   * page rule 4). Null when Run is allowed.
   */
  runBlocked?: string | null
  /** Names the SEC 8-K feed carries, for the narrative chips' titles. */
  narrativeCoverage?: number | null
}

function fmt(n: number | null): string {
  return n == null ? '—' : n.toLocaleString()
}

function chipTitle(
  c: FunnelChip,
  n: number | null,
  universe: number | null,
  coverage: number | null | undefined,
  stageMissing: string | null,
): string {
  if (stageMissing != null) return `${c.label} — ${stageMissing}`
  if (c.missing != null) return `${c.label} — ${c.missing}`
  if (n == null) return `${c.label} — nothing counts this condition`
  const pass = `${n.toLocaleString()} of ${fmt(universe)} in universe pass`
  if (c.narrative == null) return `${c.label} — ${n.toLocaleString()} of the universe pass it`
  const feed = coverage == null ? '' : ` · the 8-K feed carries ${coverage.toLocaleString()} names`
  return `${c.narrative} · SEC 8-K, by item number — narrative column, never in a composite · ${pass}${feed}`
}

function StageRow({
  reading,
  chips,
  mins,
  onMinChange,
  active,
  onToggle,
  universe,
  narrativeCoverage,
}: {
  reading: StageReading
  chips: readonly ConditionCount[] | null | undefined
  mins: Record<string, number>
  onMinChange: FunnelPanelProps['onMinChange']
  active: ReadonlySet<string>
  onToggle: FunnelPanelProps['onToggle']
  universe: number | null
  narrativeCoverage?: number | null
}) {
  const { stage } = reading
  const dead = stage.missing != null
  const min = mins[stage.id] ?? stage.min ?? 0
  // A stage that is live can still carry chips nothing counts (Catalyst's
  // Event Radar five); their shared reason is said once under the chips.
  const chipReasons = dead ? [] : [...new Set(stage.chips.flatMap((c) => (c.missing != null ? [c.missing] : [])))]
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
            const n = c.missing != null ? null : chipCount(chips, c.id)
            const capped = chips?.find((x) => x.id === c.id)?.capped === true
            const on = active.has(c.id)
            const off = dead || c.missing != null
            return (
              <button
                key={c.id}
                type="button"
                disabled={off}
                aria-pressed={on}
                title={chipTitle(c, n, universe, narrativeCoverage, stage.missing)}
                onClick={() => onToggle(stage.id, c.id)}
                className={cn(
                  // Rev .62: no frame — on is the accent fill, off the ink one. A
                  // narrative chip keeps its dashed edge: it says where the filter reads.
                  'inline-flex items-baseline gap-1.5 rounded-[8px] border border-transparent px-1.5 py-0.5 text-dense-meta',
                  off ? 'cursor-default text-muted-foreground' : 'cursor-pointer',
                  on
                    ? 'bg-primary/15 text-foreground'
                    : 'bg-[var(--mat-btn-fill)] hover:bg-[var(--mat-btn-fill-hover)]',
                  c.narrative != null && 'border-dashed border-foreground/30',
                )}
              >
                {c.narrative != null ? (
                  <span className="text-dense-micro tracking-[0.06em] text-muted-foreground">narrative</span>
                ) : null}
                <span>{c.label}</span>
                <span className="font-mono text-dense-caption text-muted-foreground">
                  {capped ? `${fmt(n)}+` : fmt(n)}
                </span>
              </button>
            )
          })}
        </div>
        {dead ? (
          <p className="mt-1.5 text-dense-caption leading-relaxed text-muted-foreground">
            {stage.missing}
          </p>
        ) : null}
        {chipReasons.map((why) => (
          <p key={why} className="mt-1.5 text-dense-caption leading-relaxed text-muted-foreground">
            Greyed chips: {why}
          </p>
        ))}
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
  onRun,
  runBusy,
  ranCount,
  runBlocked,
  narrativeCoverage,
}: FunnelPanelProps) {
  const readings = funnelReadings(universe, stageCounts)
  const counted = readings.map((r) => r.n).filter((n): n is number => n != null)
  const narrowest = counted.length > 0 ? Math.min(...counted) : null
  return (
    <section className="flex min-w-0 flex-col overflow-hidden border mat-card">
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
        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClearAll}
            disabled={active.size === 0}
            className="cursor-pointer text-dense-meta text-primary hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
          >
            {active.size === 0 ? 'nothing selected' : `Clear ${active.size}`}
          </button>
          {/* In the header, not at the foot of the stages: the panel is taller
              than a screen, and a control the reader has to scroll past seven
              stages to find is one they will not find. */}
          {onRun != null ? (
            <button
              type="button"
              disabled={active.size === 0 || runBlocked != null || runBusy}
              onClick={onRun}
              title={
                active.size === 0
                  ? 'Pick a condition, or load a preset from the rail'
                  : runBlocked != null
                    ? runBlocked
                    : 'The counts here are read from one endpoint; the names come from another, so this runs the second'
              }
              className="inline-flex h-5 cursor-pointer items-center rounded-sm border border-primary/50 bg-primary/10 px-2 text-dense-meta text-foreground hover:bg-primary/20 disabled:cursor-default disabled:border-border disabled:bg-transparent disabled:text-muted-foreground"
            >
              {runBusy ? 'Running…' : 'Run → Results'}
            </button>
          ) : null}
        </span>
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
            universe={universe}
            narrativeCoverage={narrativeCoverage}
          />
        ))
      )}
      <p className="px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        {ranCount != null ? (
          <span className="text-foreground/80">{ranCount.toLocaleString()} names in Results. </span>
        ) : null}
        Stages are AND. Chips inside a stage are OR unless the stage has a <em>min</em>, then it is
        “at least N of these”. Counts update as you click — no Search step. Each stage's number is
        measured <em>against the universe</em>, not against the stage above it: the running
        intersection is what the applied screen answers, and no cell here claims one nobody
        computed.
      </p>
    </section>
  )
}
