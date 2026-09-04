/**
 * The run, told as the sequence of steps it actually took.
 *
 * What this replaces: eleven wrapping pills that mixed six stages with four
 * mutually-exclusive outcomes, a six-line `plan_ops: persona=True` dump, and a
 * funnel drawn as five equal-height cards — so the one thing a funnel exists to
 * show, the narrowing, had no visual form at all. Every panel was open at once,
 * which is the same as having no hierarchy.
 *
 * Each stage is one row: a number, a name, and a summary short enough to read
 * without stopping. Detail is behind the row, not in front of it.
 */
import type { ReactNode } from 'react'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import { cn } from '@/lib/utils'
import { fmtStageMs, num, pct } from '@/components/research/harness/harnessFormat'
import {
  PIPELINE_PHASES,
  PIPELINE_STAGES,
  completedProgressSteps,
  funnelReach,
  stageDurationsMs,
  traceFunnel,
  tracePersonaEval,
  type HarnessFunnelStep,
  type HarnessTrace,
  type PipelinePhaseId,
} from '@/lib/harness/harnessTrace'

type StageState = 'done' | 'active' | 'pending'

/* ---------------------------------------------------------------- stage row */

export function PipelineStageRow({
  index,
  state,
  label,
  blurb,
  summary,
  expanded,
  onToggle,
  isLast,
  durationMs,
  slowest,
  children,
  accessory,
}: {
  index: number
  state: StageState
  label: string
  blurb: string
  summary: ReactNode
  expanded: boolean
  onToggle?: () => void
  isLast: boolean
  durationMs?: number | null
  slowest?: boolean
  children?: ReactNode
  accessory?: ReactNode
}) {
  const expandable = Boolean(children && onToggle)
  return (
    <li className="relative flex gap-2">
      {/* The rail: a run's stages are ordered, so the eye needs a line to follow. */}
      <div className="flex w-5 shrink-0 flex-col items-center">
        <span
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full border text-dense-micro font-semibold tabular-nums',
            state === 'done' && 'border-success/40 bg-success/15 text-success',
            state === 'active' &&
              'border-warning/50 bg-warning/20 text-warning animate-pulse',
            state === 'pending' && 'border-border bg-muted/40 text-muted-foreground/60',
          )}
        >
          {state === 'done' ? <Check className="size-3" /> : index}
        </span>
        {!isLast ? (
          <span
            className={cn(
              'w-px flex-1',
              state === 'done' ? 'bg-success/30' : 'bg-border/60',
            )}
          />
        ) : null}
      </div>

      <div className={cn('min-w-0 flex-1', isLast ? 'pb-0' : 'pb-2')}>
        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-1.5 py-1',
            expandable && 'cursor-pointer hover:bg-secondary/60',
            state === 'pending' && 'opacity-55',
          )}
          onClick={expandable ? onToggle : undefined}
          role={expandable ? 'button' : undefined}
          tabIndex={expandable ? 0 : undefined}
          onKeyDown={
            expandable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onToggle?.()
                  }
                }
              : undefined
          }
          aria-expanded={expandable ? expanded : undefined}
          title={blurb}
        >
          {expandable ? (
            expanded ? (
              <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
            )
          ) : (
            <span className="size-3 shrink-0" />
          )}
          <span className="text-dense-label font-medium shrink-0">{label}</span>
          <span className="min-w-0 flex-1 truncate text-right text-dense-meta text-muted-foreground">
            {summary}
          </span>
          {/* Where the run spent itself. A finished run used to report one total
              and six green ticks, which says nothing about the shape of the work. */}
          {durationMs != null ? (
            <span
              className={cn(
                'w-12 shrink-0 text-right tabular-nums text-dense-caption',
                slowest ? 'font-medium text-warning' : 'text-muted-foreground/70',
              )}
              title={slowest ? 'Longest stage of this run' : undefined}
            >
              {fmtStageMs(durationMs)}
            </span>
          ) : null}
          {accessory}
        </div>
        {expanded && children ? (
          <div className="mt-1 rounded-md border border-border/50 bg-background px-2.5 py-2">
            {children}
          </div>
        ) : null}
      </div>
    </li>
  )
}

/* ------------------------------------------------------------- funnel bars */

/**
 * Bar width is the fraction each step *kept*, not its share of the original
 * universe. On this data the first step goes 3,475 → 44, so a bar scaled to the
 * opening count would render one full bar and six invisible slivers — the six
 * steps that decide what you actually get to see. The kept fraction shows where
 * the cuts are; the running counts beside it carry the absolute scale.
 */
export function HarnessFunnelBars({ trace }: { trace: HarnessTrace }) {
  const funnel = traceFunnel(trace)
  if (funnel.length === 0) {
    return (
      <p className="text-dense-meta text-muted-foreground">
        No funnel steps — this run predates white-box tracing, or the universe
        resolver returned nothing.
      </p>
    )
  }
  const opening = funnel[0].in_count
  const closing = funnel[funnel.length - 1].out_count

  return (
    <div className="space-y-1">
      {funnel.map((step) => (
        <FunnelBarRow key={step.name} step={step} />
      ))}
      <div className="flex items-baseline justify-between gap-2 border-t border-border/50 pt-1.5 text-dense-meta">
        <span className="font-medium">Survived</span>
        <span className="tabular-nums">
          {num(opening)} → <span className="font-semibold">{num(closing)}</span>
          <span className="text-muted-foreground"> · {pct(closing, opening)}</span>
        </span>
      </div>
    </div>
  )
}

function FunnelBarRow({ step }: { step: HarnessFunnelStep }) {
  const kept = step.in_count > 0 ? step.out_count / step.in_count : 1
  const dropped = step.in_count - step.out_count
  const cut = dropped > 0
  return (
    <div
      className={cn('space-y-0.5', step.skipped && 'opacity-55')}
      title={step.filter || undefined}
    >
      <div className="flex items-baseline gap-2 text-dense-meta">
        <span className="w-28 shrink-0 truncate font-medium">{step.name}</span>
        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted">
          <div
            className={cn('h-full', cut ? 'bg-warning' : 'bg-success/60')}
            style={{ width: `${Math.max(kept * 100, 1.5)}%` }}
          />
        </div>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {num(step.in_count)} → <span className="text-foreground">{num(step.out_count)}</span>
        </span>
        <span
          className={cn(
            'w-14 shrink-0 text-right tabular-nums',
            cut ? 'text-warning' : 'text-muted-foreground/60',
          )}
        >
          {cut ? `−${num(dropped)}` : '—'}
        </span>
      </div>
      {step.filter || step.skip_reason ? (
        <p className="pl-[7.5rem] text-dense-caption text-muted-foreground">
          {step.skip_reason ? (
            <span className="text-warning">{step.skip_reason}</span>
          ) : (
            step.filter
          )}
        </p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------ persona fold */

export interface PersonaVerdict {
  agent: string
  source: string
  stance: string
  confidence: number | null
  summary: string
}

export interface PersonaRow {
  symbol: string
  net: string
  validate: string
  blocked: boolean
  verdicts: PersonaVerdict[]
}

export function personaRows(trace: HarnessTrace): PersonaRow[] {
  const ev = tracePersonaEval(trace)
  const raw = Array.isArray(ev?.per_symbol) ? (ev.per_symbol as Record<string, unknown>[]) : []
  return raw.map((r) => ({
    symbol: String(r.symbol ?? '—'),
    net: String(r.net_stance ?? '—'),
    validate: String(r.validate_stance ?? '—'),
    blocked: r.blocked_by_validate === true,
    verdicts: (Array.isArray(r.verdicts) ? (r.verdicts as Record<string, unknown>[]) : []).map(
      (v) => ({
        agent: String(v.agent ?? '—'),
        source: String(v.source ?? '—'),
        stance: String(v.stance ?? '—'),
        confidence: typeof v.confidence === 'number' ? v.confidence : null,
        summary: String(v.summary ?? ''),
      }),
    ),
  }))
}

/**
 * Eight rows reading `net=caution` eight times says one thing, not eight. Fold
 * the agreement, keep the exceptions visible.
 */
export function personaVerdictSummary(rows: PersonaRow[]): string {
  if (rows.length === 0) return '—'
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.net, (counts.get(r.net) ?? 0) + 1)
  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([stance, n]) => (n === rows.length ? `${n}/${n} ${stance}` : `${n} ${stance}`))
  const blocked = rows.filter((r) => r.blocked).length
  return `${parts.join(' · ')} · ${blocked} blocked`
}

/**
 * Fold key for a symbol's whole panel of verdicts.
 *
 * Numbers are masked out because the heuristic embeds the SEPA score in its own
 * prose ("Mixed structure (SEPA 79) · PIVOT"), which would otherwise split eight
 * identical judgements into eight groups over a rounding difference. What is
 * being compared is the reasoning, not the score — the score is shown per
 * symbol alongside its name.
 */
function verdictShape(row: PersonaRow): string {
  return row.verdicts
    .map((v) => `${v.agent}:${v.stance}:${v.summary.replace(/[\d.]+/g, '#')}`)
    .join('|')
}

export interface PersonaGroup {
  shape: string
  members: PersonaRow[]
  verdicts: PersonaVerdict[]
}

/**
 * Eight candidates that drew the same four verdicts is one judgement repeated
 * eight times, and printing it eight times buries the fact. Folded, the
 * repetition becomes the headline it should be: the personas did not
 * differentiate between these names.
 */
export function groupPersonaRows(rows: PersonaRow[]): PersonaGroup[] {
  const byShape = new Map<string, PersonaRow[]>()
  for (const r of rows) {
    const k = verdictShape(r)
    const seen = byShape.get(k)
    if (seen) seen.push(r)
    else byShape.set(k, [r])
  }
  return [...byShape.entries()].map(([shape, members]) => ({
    shape,
    members,
    verdicts: members[0].verdicts,
  }))
}

function stanceClass(stance: string): string {
  if (stance === 'support') return 'text-success'
  if (stance === 'caution') return 'text-warning'
  if (stance === 'oppose' || stance === 'block') return 'text-destructive'
  return 'text-muted-foreground'
}

function VerdictList({ verdicts }: { verdicts: PersonaVerdict[] }) {
  if (verdicts.length === 0) {
    return (
      <p className="text-dense-caption text-muted-foreground">
        No per-persona verdicts recorded.
      </p>
    )
  }
  return (
    <ul className="space-y-1">
      {verdicts.map((v) => (
        <li key={v.agent} className="flex gap-2 text-dense-caption">
          <span className="w-16 shrink-0 font-medium">{v.agent}</span>
          <span className={cn('w-14 shrink-0', stanceClass(v.stance))}>{v.stance}</span>
          <span className="w-8 shrink-0 tabular-nums text-muted-foreground/70">
            {v.confidence == null ? '—' : v.confidence.toFixed(2)}
          </span>
          <span className="min-w-0 flex-1 text-muted-foreground">{v.summary}</span>
        </li>
      ))}
    </ul>
  )
}

export function HarnessPersonaFold({ trace }: { trace: HarnessTrace }) {
  const rows = personaRows(trace)
  const ev = tracePersonaEval(trace)
  if (!ev) {
    return (
      <p className="text-dense-meta text-muted-foreground">
        No persona_evaluate step — eval skipped, or the run predates Policy ×
        Personas Wave 1.
      </p>
    )
  }
  const mode = typeof ev.mode === 'string' ? ev.mode : '—'
  const fallback = ev.fallback_used === true
  const isLlm = mode === 'agent' && !fallback
  const agents = [...new Set(rows.flatMap((r) => r.verdicts.map((v) => v.agent)))]
  const groups = groupPersonaRows(rows)

  return (
    <div className="space-y-2">
      {/* What actually produced these opinions. "Personas" reads as LLM agents
          reasoning over the batch; by default they are deterministic heuristics
          over the same evidence, and that difference decides how much the
          verdicts are worth. */}
      <p className="text-dense-caption">
        {isLlm ? (
          <>
            <span className="text-info font-medium">LLM persona agents</span> read each
            candidate{agents.length > 0 ? ` — ${agents.join(', ')}` : ''}.
          </>
        ) : (
          <>
            <span className="text-warning font-medium">
              Deterministic heuristics{fallback ? ' (agents requested, fell back)' : ''}
            </span>
            {agents.length > 0 ? ` — ${agents.join(', ')}` : ''} scored the same evidence
            without an LLM. Set{' '}
            <span className="font-mono">BIFROST_PERSONA_EVAL_AGENTS=1</span> for live agents.
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-1">
        <DenseTag
          variant={Number(ev.blocked_by_validate) > 0 ? 'danger' : 'success'}
          size="cell"
        >
          {String(ev.blocked_by_validate ?? 0)} blocked by validate
        </DenseTag>
        <DenseTag variant={ev.auto_approve_eligible ? 'success' : 'warning'} size="cell">
          auto-approve {ev.auto_approve_eligible ? 'eligible' : 'held'}
        </DenseTag>
        {typeof ev.holdings_status === 'string' && ev.holdings_status !== 'applied' ? (
          <DenseTag
            variant="warning"
            size="cell"
            title="Portfolio persona had no holdings to reason over."
          >
            holdings {String(ev.holdings_status)}
          </DenseTag>
        ) : null}
      </div>

      {groups.map((g) => (
        <div key={g.shape} className="space-y-1 rounded-md border border-border/50 px-2 py-1.5">
          <p className="text-dense-caption">
            {g.members.length === rows.length && rows.length > 1 ? (
              <>
                <span className="font-medium">All {rows.length}</span> drew the same four
                verdicts — the personas did not separate these names.
              </>
            ) : (
              <span className="font-medium">
                {g.members.length} candidate{g.members.length === 1 ? '' : 's'}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1">
            {g.members.map((m) => (
              <DenseTag
                key={m.symbol}
                variant={m.blocked ? 'danger' : 'symbol'}
                size="cell"
                title={`net ${m.net} · validate ${m.validate}`}
              >
                {m.symbol}
                {m.blocked ? ' · blocked' : ''}
              </DenseTag>
            ))}
          </div>
          <VerdictList verdicts={g.verdicts} />
        </div>
      ))}
      {typeof ev.error === 'string' ? (
        <p className="text-dense-meta text-destructive">{ev.error}</p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------- stage summary text */

export interface StageView {
  step: string
  index: number
  label: string
  blurb: string
  state: StageState
  summary: ReactNode
  /** null when the run predates stage timing. */
  durationMs: number | null
  /** The stage that took the largest share — where the run actually spent itself. */
  slowest: boolean
}

/**
 * One line per stage, in the language of what the run decided — not the shape
 * of the event that recorded it.
 */
export function stageViews(
  trace: HarnessTrace,
  planJson: Record<string, unknown> | null,
  status: string,
): StageView[] {
  const done = completedProgressSteps(trace)
  const durations = stageDurationsMs(trace)
  const slowestStep =
    durations.size === 0
      ? null
      : [...durations.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const current = trace.progress?.step
  const running = status === 'running'
  const reach = funnelReach(trace)
  const funnel = traceFunnel(trace)
  const persona = personaRows(trace)
  const proposeCount = trace.events.find((e) => e.step === 'propose_candidates')?.count
  const report = trace.events.find((e) => e.step === 'compose_report')
  const draft = trace.events.find((e) => e.step === 'draft_candidate_batch')
  const planOps = trace.events.find((e) => e.step === 'plan_ops')
  const ops = Array.isArray(planOps?.ops) ? (planOps.ops as unknown[]).length : null
  const generatedBy =
    typeof planJson?.generated_by === 'string' ? planJson.generated_by : null

  const summaryFor = (step: string): ReactNode => {
    switch (step) {
      case 'plan':
        return [generatedBy, ops != null ? `${ops} ops` : null]
          .filter(Boolean)
          .join(' · ') || '—'
      case 'scan_universe': {
        if (!reach) return '—'
        const cuts = funnel.filter((s) => s.out_count < s.in_count).length
        return `${num(reach.considered)} → ${num(reach.proposed)} · ${cuts} cut${cuts === 1 ? '' : 's'}`
      }
      case 'propose_candidates':
        return typeof proposeCount === 'number' ? `${proposeCount} candidates` : '—'
      case 'persona_evaluate':
        return personaVerdictSummary(persona)
      case 'compose_report':
        return typeof report?.candidates === 'number'
          ? `${report.candidates} covered${
              typeof report.with_settled_record === 'number'
                ? ` · ${report.with_settled_record} with a settled record`
                : ''
            }`
          : '—'
      case 'draft_candidate_batch':
        return draft?.draft_id ? 'batch handed over' : '—'
      default:
        return '—'
    }
  }

  return PIPELINE_STAGES.map((s, i) => ({
    step: s.step,
    index: i + 1,
    label: s.label,
    blurb: s.blurb,
    state: done.has(s.step)
      ? 'done'
      : running && current === s.step
        ? 'active'
        : 'pending',
    summary: summaryFor(s.step),
    durationMs: durations.get(s.step) ?? null,
    slowest: slowestStep === s.step,
  }))
}


/* --------------------------------------------------------------- phase view */

export interface PhaseView {
  id: PipelinePhaseId
  label: string
  blurb: string
  /**
   * A derived view for the phase, distinct from its stages.
   *
   * Stages come from the trace: each is something the run recorded doing, with
   * a time and a state. A panel is computed from policy and outcome, so it has
   * neither. Forcing one into the stage list would mean inventing a status and
   * a duration for something that never ran — so phases carry both, and the two
   * kinds stay honest about what they are.
   */
  panel: string | null
  stages: StageView[]
  state: StageState
  /** null while no member stage has been timed. */
  durationMs: number | null
}

/**
 * Phases are derived from their stages, never declared alongside them.
 *
 * A hand-maintained phase status is a second source of truth that drifts the
 * first time a stage is added — the kind of divergence this console keeps
 * finding elsewhere. A phase is done when all of its stages are, active while
 * any is running, and costs what its stages cost.
 */
export function phaseViews(stages: StageView[]): PhaseView[] {
  const byStep = new Map(PIPELINE_STAGES.map((s) => [s.step as string, s.phase as PipelinePhaseId]))
  return PIPELINE_PHASES.map((phase) => {
    const members = stages.filter((s) => byStep.get(s.step) === phase.id)
    const timed = members.filter((s) => s.durationMs != null)
    return {
      id: phase.id,
      label: phase.label,
      blurb: phase.blurb,
      panel: phase.panel,
      stages: members,
      state: (members.some((s) => s.state === 'active')
        ? 'active'
        : members.length > 0 && members.every((s) => s.state === 'done')
          ? 'done'
          : 'pending') as StageState,
      durationMs:
        timed.length === 0 ? null : timed.reduce((n, s) => n + (s.durationMs ?? 0), 0),
    }
  }).filter((p) => p.stages.length > 0)
}

