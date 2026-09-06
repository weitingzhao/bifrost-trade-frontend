/**
 * Panels the Pipeline drawer opens on demand.
 *
 * The progress strip, verdict strip, batch-result strip, funnel cards and
 * persona list that used to live here were replaced by HarnessPipelineStepper —
 * they rendered the run as a pile of simultaneous panels rather than a sequence.
 * What remains is detail: raw plan steps, raw trace, and run outputs.
 */
import { fmtJudgeCost, fmtStageMs } from '@/components/research/harness/harnessFormat'
import {
  parseHarnessTrace,
  planProvenance,
  traceScanEvent,
  type ObjectiveRunDetail,
} from '@/lib/harness/harnessTrace'

/** Who wrote the plan and every hop it took to get there (B1). */
function PlanAttempts({ planJson }: { planJson: Record<string, unknown> | null }) {
  const plan = planProvenance(planJson)
  if (!plan) return null
  return (
    <div className="space-y-0.5 text-dense-meta" data-testid="plan-attempts">
      <p>
        <span className="font-medium">{plan.generatedBy}</span>
        {plan.model ? <span className="font-mono"> · {plan.model}</span> : null}
        {plan.fallbackReason ? (
          <span className="text-warning"> · {plan.fallbackReason}</span>
        ) : null}
      </p>
      {plan.attempts.length > 0 ? (
        <ul className="space-y-0.5 font-mono text-muted-foreground">
          {plan.attempts.map((a, i) => (
            <li key={`${a.model}-${i}`}>
              {a.model}
              {a.provider ? `@${a.provider}` : ''} ·{' '}
              {a.ok ? (
                <span className="text-success">ok</span>
              ) : (
                <span className="text-destructive">{a.error ?? 'failed'}</span>
              )}
              {a.elapsed_ms != null && a.elapsed_ms > 0 ? ` · ${fmtStageMs(a.elapsed_ms)}` : ''}
              {a.cost_usd != null && a.cost_usd > 0 ? ` · ${fmtJudgeCost(a.cost_usd)}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function HarnessPlanStepper({ planJson }: { planJson: Record<string, unknown> | null }) {
  const steps = Array.isArray(planJson?.steps)
    ? (planJson!.steps as Record<string, unknown>[])
    : []
  if (steps.length === 0) {
    return (
      <div className="space-y-2">
        <PlanAttempts planJson={planJson} />
        <p className="text-dense-meta text-muted-foreground">No plan steps recorded.</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
    <PlanAttempts planJson={planJson} />
    <ol className="space-y-2 border-l border-border/60 pl-3">
      {steps.map((step, i) => (
        <li key={`${step.op ?? i}`} className="space-y-0.5">
          <p className="text-dense-label font-medium font-mono">{String(step.op ?? 'step')}</p>
          {typeof step.note === 'string' ? (
            <p className="text-dense-meta text-muted-foreground whitespace-pre-wrap">{step.note}</p>
          ) : null}
        </li>
      ))}
    </ol>
    </div>
  )
}

export function HarnessTraceEventCard({ traceJson }: { traceJson: unknown }) {
  const trace = parseHarnessTrace(traceJson)
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {trace.events.map((ev, i) => (
        <details key={`${ev.step}-${i}`} className="rounded border border-border/40 px-2 py-1">
          <summary className="cursor-pointer text-dense-label font-mono">{ev.step}</summary>
          <pre className="mt-1 whitespace-pre-wrap break-words text-dense-micro font-mono text-muted-foreground">
            {JSON.stringify(ev, null, 2)}
          </pre>
        </details>
      ))}
      {trace.error ? (
        <p className="text-dense-meta text-destructive">{trace.error}</p>
      ) : null}
    </div>
  )
}

export function HarnessRunOutputs({
  run,
  draftIds,
}: {
  run: ObjectiveRunDetail
  draftIds: string[]
}) {
  const scan = traceScanEvent(parseHarnessTrace(run.trace_json))
  const symbols = Array.isArray(scan?.symbols) ? (scan.symbols as string[]) : []
  return (
    <div className="space-y-2 text-dense-meta">
      <p>
        Candidates: {symbols.length ? symbols.join(', ') : '—'}
      </p>
      {draftIds.length > 0 ? (
        <p>
          Drafts:{' '}
          {draftIds.map((id) => (
            <span key={id} className="font-mono text-dense-caption mr-2">
              {id}
            </span>
          ))}
        </p>
      ) : (
        <p className="text-muted-foreground">No draft ids on run outputs.</p>
      )}
    </div>
  )
}
