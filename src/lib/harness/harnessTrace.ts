/**
 * Harness trace types — LS-3 white-box pipeline.
 */
import type { ObjectiveRun, ObjectiveRunStatus } from '@/api/research/harness'

export interface HarnessFunnelStep {
  name: string
  in_count: number
  out_count: number
  filter?: string
  dropped_sample?: string[]
  optional?: boolean
  skipped?: boolean
  skip_reason?: string
}

export interface HarnessTraceEvent {
  step: string
  /** Milliseconds from the start of the run to when this event was recorded. */
  at_ms?: number
  [key: string]: unknown
}

/**
 * How long each pipeline stage took, keyed by step.
 *
 * Measured stage-to-stage, not event-to-event. The trace interleaves the six
 * stages with the work they generate — `propose_candidates` is preceded by one
 * `propose_candidate` per symbol — so timing against the previous *event* would
 * charge Propose only the last insert and silently drop the rest of its work.
 * The gap since the previous stage is what that stage cost.
 *
 * Runs recorded before research 0.65.4 carry no marks and get an empty map, so
 * the UI can tell "not measured" from "instant" — the distinction this codebase
 * has had to relearn more than once.
 */
export function stageDurationsMs(trace: HarnessTrace): Map<string, number> {
  const stageSteps = new Set<string>(PIPELINE_STAGES.map((s) => s.step))
  const marks: { step: string; at: number }[] = []
  for (const ev of trace.events) {
    if (typeof ev.at_ms !== 'number' || !stageSteps.has(ev.step)) continue
    // A stage recorded more than once ends at its last mark.
    const seen = marks.find((m) => m.step === ev.step)
    if (seen) seen.at = ev.at_ms
    else marks.push({ step: ev.step, at: ev.at_ms })
  }
  if (marks.length === 0) return new Map()
  marks.sort((a, b) => a.at - b.at)
  const out = new Map<string, number>()
  let prev = 0
  for (const m of marks) {
    out.set(m.step, Math.max(0, m.at - prev))
    prev = m.at
  }
  return out
}

export interface HarnessTrace {
  events: HarnessTraceEvent[]
  error?: string
  progress?: {
    step?: string
    label?: string
    detail?: string
  }
}

export interface ObjectiveRunDetail extends ObjectiveRun {
  objective_title?: string
  objective_policy_json?: Record<string, unknown>
}

export function parseHarnessTrace(raw: unknown): HarnessTrace {
  if (!raw || typeof raw !== 'object') return { events: [] }
  const obj = raw as Record<string, unknown>
  const events = Array.isArray(obj.events) ? (obj.events as HarnessTraceEvent[]) : []
  const progressRaw = obj.progress
  let progress: HarnessTrace['progress']
  if (progressRaw && typeof progressRaw === 'object') {
    const p = progressRaw as Record<string, unknown>
    progress = {
      step: typeof p.step === 'string' ? p.step : undefined,
      label: typeof p.label === 'string' ? p.label : undefined,
      detail: typeof p.detail === 'string' ? p.detail : undefined,
    }
  }
  return {
    events,
    error: typeof obj.error === 'string' ? obj.error : undefined,
    progress,
  }
}

/**
 * The run in four movements, and the stages inside each.
 *
 * Six flat stages read as six equal things. They are not: `scan_universe`
 * narrows 3,475 symbols by rule and `persona_evaluate` forms an opinion about
 * the eight that survived, and those are different kinds of work with different
 * failure modes. Grouping them is what lets either half be refined without the
 * other becoming harder to read.
 *
 * Both tables are the extension seam. A new stage is one entry that names its
 * phase; a new phase is one entry here. Nothing renders by index or by position,
 * so neither addition touches the stepper — which is the property that has to
 * hold before the pipeline is deepened further.
 */
export const PIPELINE_PHASES = [
  { id: 'setup', label: 'Set up', blurb: 'What this run is allowed to do', panel: 'rules' },
  { id: 'screen', label: 'Screen', blurb: 'Narrow the market by rule', panel: null },
  { id: 'judge', label: 'Judge', blurb: 'Read the survivors and take a view', panel: null },
  { id: 'decide', label: 'Decide', blurb: 'Hand the batch over', panel: null },
] as const

export type PipelinePhaseId = (typeof PIPELINE_PHASES)[number]['id']

/**
 * `governedBy` names the policy fields that decide how a stage behaves.
 *
 * The Loop's "trading system" is its LoopPolicy, and the policy is not one
 * setting for the run — each field governs one stage. `max_candidates` is why
 * Scan ends at 8; `require_validate_pass` is why a persona can hold the batch.
 * Declaring the mapping here means a stage can show the knobs that produced its
 * own outcome, next to that outcome, rather than in a policy panel the reader
 * has to hold in their head while looking somewhere else.
 */
export const PIPELINE_STAGES = [
  {
    step: 'plan',
    phase: 'setup',
    label: 'Plan',
    blurb: 'Decide what this run will do',
    governedBy: ['use_llm_plan', 'llm_model'],
  },
  {
    step: 'scan_universe',
    phase: 'screen',
    label: 'Scan',
    blurb: 'Narrow the universe through the funnel',
    governedBy: [
      'universe_mode',
      'layers',
      'option_overlay',
      'discovery_assist',
      'max_candidates',
    ],
  },
  {
    step: 'propose_candidates',
    phase: 'screen',
    label: 'Propose',
    blurb: 'Turn survivors into candidates',
    governedBy: ['min_composite_score', 'min_hit_rate', 'flag_filter', 'seed_symbols'],
  },
  {
    step: 'persona_evaluate',
    phase: 'judge',
    label: 'Personas',
    blurb: 'Each persona votes on every candidate',
    governedBy: ['persona_evaluate', 'require_validate_pass'],
  },
  {
    step: 'compose_report',
    phase: 'judge',
    label: 'Report',
    blurb: 'Write the case for the batch',
    governedBy: [],
  },
  {
    step: 'draft_candidate_batch',
    phase: 'decide',
    label: 'Decision',
    blurb: 'Hand the batch to the Owner',
    governedBy: ['auto_validate'],
  },
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

/** How a run ended. Exactly one of these applies. */
export const TERMINAL_STATES = [
  { step: 'approve_all', label: 'Auto-approved', variant: 'success' },
  { step: 'curate', label: 'Curated', variant: 'success' },
  { step: 'held', label: 'Held', variant: 'danger' },
  { step: 'awaiting_approval', label: 'Awaiting you', variant: 'warning' },
] as const

export type TerminalState = (typeof TERMINAL_STATES)[number]

/** The terminal state this run reached, if it reached one. */
export function traceTerminalState(trace: HarnessTrace): TerminalState | null {
  const done = completedProgressSteps(trace)
  for (const t of TERMINAL_STATES) {
    if (done.has(t.step)) return t
  }
  return null
}

export function completedProgressSteps(trace: HarnessTrace): Set<string> {
  const steps = new Set<string>()
  for (const ev of trace.events) {
    if (typeof ev.step === 'string') steps.add(ev.step)
  }
  return steps
}

export function traceScanEvent(trace: HarnessTrace): HarnessTraceEvent | undefined {
  return trace.events.find((e) => e.step === 'scan_universe')
}

export function traceFunnel(trace: HarnessTrace): HarnessFunnelStep[] {
  const scan = traceScanEvent(trace)
  const funnel = scan?.funnel
  if (!Array.isArray(funnel)) return []
  return funnel.filter(
    (s): s is HarnessFunnelStep =>
      typeof s === 'object' &&
      s !== null &&
      typeof (s as HarnessFunnelStep).name === 'string',
  )
}

export interface FunnelReach {
  considered: number
  proposed: number
  /**
   * `event` is the number the run actually proposed. `funnel_tail` is inferred
   * from the funnel's last step, for runs recorded before the funnel accounted
   * for its own cuts — it can overstate the output.
   */
  source: 'event' | 'funnel_tail'
}

/**
 * How many symbols the run looked at, and how many it proposed.
 *
 * The mode label alone ("scan_legacy") never said whether that meant 28 symbols
 * or 14,836 — you had to query the warehouse to find out.
 *
 * The proposed count comes from the `propose_candidates` event, which is the run
 * saying what it did. Reading the funnel's last step instead was an inference
 * that held only while the funnel's final step was also the final cut: once
 * `option_overlay` and `discovery_assist` landed after the selection layers and
 * passed their input straight through, a run that proposed 8 reported 24 in both
 * the drawer header and the Console's FUNNEL column. The backend now records
 * every cut (research 0.65.3), but old runs keep their old traces, so the
 * fallback stays — and says so, rather than passing an inference off as a fact.
 */
export function funnelReach(trace: HarnessTrace): FunnelReach | null {
  const funnel = traceFunnel(trace)
  if (funnel.length === 0) return null
  const considered = funnel[0]?.in_count
  if (!Number.isFinite(considered)) return null

  const proposeCount = trace.events.find((e) => e.step === 'propose_candidates')?.count
  if (typeof proposeCount === 'number' && Number.isFinite(proposeCount)) {
    return { considered, proposed: proposeCount, source: 'event' }
  }

  const proposed = funnel[funnel.length - 1]?.out_count
  if (!Number.isFinite(proposed)) return null
  return { considered, proposed, source: 'funnel_tail' }
}

export function tracePersonaEval(trace: HarnessTrace): HarnessTraceEvent | undefined {
  return trace.events.find((e) => e.step === 'persona_evaluate')
}

export function runDurationMs(
  started: string | null | undefined,
  finished: string | null | undefined,
): number | null {
  if (!started || !finished) return null
  const a = Date.parse(started)
  const b = Date.parse(finished)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.max(0, b - a)
}

export function statusVariant(
  status: ObjectiveRunStatus,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'awaiting_approval') return 'warning'
  if (status === 'failed') return 'danger'
  return 'neutral'
}

/** A run, plus the runs it repeats. */
export interface RunGroup {
  run: ObjectiveRun
  /** Older runs of the same objective, same day, same funnel — newest first. */
  repeats: ObjectiveRun[]
}

/**
 * Collapse a day's re-runs of one objective into a single row.
 *
 * The Console listed 23 runs, all awaiting_approval, with `47 → 8 · 17%`
 * repeating eight times: the same objective re-run through the day, each time
 * screening the same universe to the same eight names. Counting records instead
 * of decisions is the same failure the Decision Inbox had, so this is the same
 * fix — fold, keep the newest, and say how many were folded.
 *
 * The key is deliberately strict: same objective, same calendar day, identical
 * funnel shape. Two runs whose funnels differ screened different ground and are
 * two results, not one repeated.
 */
export function groupIdenticalRuns(runs: ObjectiveRun[]): RunGroup[] {
  const slots: (RunGroup | null)[] = []
  const members = new Map<string, ObjectiveRun[]>()
  const slotOf = new Map<string, number>()

  for (const run of runs) {
    const key = runFoldKey(run)
    if (key === null) {
      slots.push({ run, repeats: [] })
      continue
    }
    const seen = members.get(key)
    if (seen) {
      seen.push(run)
      slots.push(null)
      continue
    }
    members.set(key, [run])
    slotOf.set(key, slots.length)
    slots.push(null)
  }

  for (const [key, group] of members) {
    const [newest, ...repeats] = group.slice().sort(newestRunFirst)
    slots[slotOf.get(key) as number] = { run: newest, repeats }
  }
  return slots.filter((g): g is RunGroup => g !== null)
}

/** Fold key, or null for a run that must stand alone. */
function runFoldKey(run: ObjectiveRun): string | null {
  if (!run.objective_id || !run.started_at) return null
  const day = run.started_at.slice(0, 10)
  if (day.length !== 10) return null
  const steps = traceFunnel(parseHarnessTrace(run.trace_json))
  // No funnel means we cannot tell whether two runs screened the same ground.
  if (steps.length === 0) return null
  const shape = steps.map((s) => `${s.name}:${s.in_count}>${s.out_count}`).join('|')
  return `${run.objective_id} ${day} ${run.status} ${shape}`
}

function newestRunFirst(a: ObjectiveRun, b: ObjectiveRun): number {
  const ta = Date.parse(a.started_at ?? '')
  const tb = Date.parse(b.started_at ?? '')
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta
  // Unparsable or tied timestamps must still order deterministically.
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}


/* ------------------------------------------------- what each rule actually did */

export type RuleKind = 'gate' | 'advisory' | 'limit' | 'off'

export interface RuleImpact {
  key: string
  kind: RuleKind
  /** Raw policy value; the view formats it. */
  setting: unknown
  /** Symbols this rule removed on this run. null = the run did not measure it. */
  dropped: number | null
}

/** Funnel steps that belong to each policy rule. The cap does its work twice. */
const RULE_FUNNEL_STEPS: Record<string, readonly string[]> = {
  sepa: ['sepa'],
  momentum: ['momentum'],
  events: ['events'],
  option_overlay: ['option_overlay'],
  discovery_assist: ['discovery_assist'],
  max_candidates: ['rank_cut', 'max_candidates'],
}

function ruleKind(key: string, value: unknown): RuleKind {
  if (key === 'max_candidates') return 'limit'
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    if (v.enabled === false) return 'off'
    if (v.required === true) return 'gate'
  }
  return 'advisory'
}

/**
 * Each rule of the trading system, with the number of symbols it removed.
 *
 * The policy says what the system is *allowed* to reject; the funnel says what
 * it *did*. Read together they answer the question a settings page cannot: which
 * of these rules is actually selecting anything. On the daily stock objective
 * the answer is one of them — sepa removes 3,431 and the three optional layers
 * remove nobody at all, because `required: false` does not mean "lenient", it
 * means "never rejects".
 *
 * A rule with no matching funnel step reports null, not 0. "Not measured" and
 * "removed nobody" are different facts, and rendering them alike is the failure
 * this console has had to correct more than once.
 */
export function ruleImpacts(
  policy: Record<string, unknown> | null | undefined,
  trace: HarnessTrace,
): RuleImpact[] {
  if (!policy) return []
  const dropped = new Map<string, number>()
  for (const step of traceFunnel(trace)) {
    dropped.set(step.name, Math.max(0, step.in_count - step.out_count))
  }

  const layers = (policy.layers ?? {}) as Record<string, unknown>
  const out: RuleImpact[] = []

  const push = (key: string, setting: unknown) => {
    if (setting === undefined) return
    const steps = RULE_FUNNEL_STEPS[key] ?? []
    const measured = steps.filter((n) => dropped.has(n))
    out.push({
      key,
      kind: ruleKind(key, setting),
      setting,
      dropped:
        measured.length === 0
          ? null
          : measured.reduce((n, name) => n + (dropped.get(name) ?? 0), 0),
    })
  }

  for (const key of ['sepa', 'momentum', 'events']) push(key, layers[key])
  push('option_overlay', policy.option_overlay)
  push('discovery_assist', policy.discovery_assist)
  push('max_candidates', policy.max_candidates)
  return out
}

/** "1 gate · 3 advisory · cap 8" — the stance in one line. */
export function ruleStanceSummary(rules: RuleImpact[]): string {
  if (rules.length === 0) return '—'
  const gates = rules.filter((r) => r.kind === 'gate').length
  const advisory = rules.filter((r) => r.kind === 'advisory').length
  const off = rules.filter((r) => r.kind === 'off').length
  const cap = rules.find((r) => r.kind === 'limit')
  const parts = [`${gates} gate${gates === 1 ? '' : 's'}`, `${advisory} advisory`]
  if (off > 0) parts.push(`${off} off`)
  if (cap && typeof cap.setting === 'number') parts.push(`cap ${cap.setting}`)
  return parts.join(' · ')
}


/* ------------------------------------------------------- rule impact drift */

/**
 * Which instrument measured a funnel — the set of steps it recorded.
 *
 * Comparing across instruments produces fiction. Runs from 2026-09-01 opened the
 * funnel at SEPA's own output and emitted no `rank_cut` or `max_candidates`, so
 * sepa read as removing nobody; against a later run that opens at the universe
 * and removes 3,431, the day-over-day change came out as "+3,431" — a market
 * collapse that never happened. The step set is the honest discriminator: if it
 * differs, the ruler changed and the numbers are not on one scale.
 */
export function funnelInstrument(funnel: HarnessFunnelStep[]): string {
  return funnel
    .map((f) => f.name)
    .sort()
    .join(',')
}

export interface RuleDay {
  /** YYYY-MM-DD in the run's own timezone offset, as recorded. */
  day: string
  /** Symbols this rule removed that day. */
  dropped: number
  /** Runs that day which measured this rule. Same-day runs read one snapshot. */
  runs: number
}

export interface RuleDrift {
  key: string
  days: RuleDay[]
  /** Today minus the previous measured day, or null with under two days. */
  change: number | null
}

/**
 * A rule's impact day by day, not run by run.
 *
 * Same-day runs read the same daily snapshot and so remove exactly the same
 * symbols — fifteen runs of the daily stock objective on 2026-09-04 each dropped
 * 3,431 at sepa. Plotting per run would draw a flat line and call it stability,
 * when it is just the same measurement repeated. Drift is a day-over-day
 * question.
 *
 * Days where a rule has no funnel step are left out rather than entered as
 * zero. Runs recorded before the funnel accounted for its own cuts have exactly
 * that gap, and charting them as zeroes would invent a collapse that never
 * happened — the instrument changed, not the market.
 */
export function ruleDrift(
  runs: { started_at?: string | null; trace_json?: unknown }[],
  ruleKey: string,
  /** Only days measured by this instrument are comparable. */
  instrument?: string,
): RuleDrift {
  const steps = RULE_FUNNEL_STEPS[ruleKey] ?? []
  const byDay = new Map<string, { dropped: number; runs: number }>()

  for (const run of runs) {
    const day = (run.started_at ?? '').slice(0, 10)
    if (day.length !== 10) continue
    const funnel = traceFunnel(parseHarnessTrace(run.trace_json))
    if (instrument !== undefined && funnelInstrument(funnel) !== instrument) continue
    const measured = funnel.filter((f) => steps.includes(f.name))
    if (measured.length === 0) continue
    const dropped = measured.reduce((n, f) => n + Math.max(0, f.in_count - f.out_count), 0)
    const seen = byDay.get(day)
    // Same-day runs agree by construction; keep the latest and count them.
    if (seen) byDay.set(day, { dropped, runs: seen.runs + 1 })
    else byDay.set(day, { dropped, runs: 1 })
  }

  const days = [...byDay.entries()]
    .map(([day, v]) => ({ day, dropped: v.dropped, runs: v.runs }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))

  return {
    key: ruleKey,
    days,
    change: days.length < 2 ? null : days[days.length - 1].dropped - days[days.length - 2].dropped,
  }
}
