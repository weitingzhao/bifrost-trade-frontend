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
