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
  [key: string]: unknown
}

export interface HarnessTrace {
  events: HarnessTraceEvent[]
  error?: string
}

export interface ObjectiveRunDetail extends ObjectiveRun {
  objective_title?: string
  objective_policy_json?: Record<string, unknown>
}

export function parseHarnessTrace(raw: unknown): HarnessTrace {
  if (!raw || typeof raw !== 'object') return { events: [] }
  const obj = raw as Record<string, unknown>
  const events = Array.isArray(obj.events) ? (obj.events as HarnessTraceEvent[]) : []
  return {
    events,
    error: typeof obj.error === 'string' ? obj.error : undefined,
  }
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

/**
 * How many symbols the run looked at, and how many it proposed.
 *
 * The mode label alone ("scan_legacy") never said whether that meant 28 symbols
 * or 14,836 — you had to query the warehouse to find out. Reads the first step's
 * input and the last step's output, so it survives modes with different stages.
 */
export function funnelReach(
  trace: HarnessTrace,
): { considered: number; proposed: number } | null {
  const funnel = traceFunnel(trace)
  if (funnel.length === 0) return null
  const considered = funnel[0]?.in_count
  const proposed = funnel[funnel.length - 1]?.out_count
  if (!Number.isFinite(considered) || !Number.isFinite(proposed)) return null
  return { considered, proposed }
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
