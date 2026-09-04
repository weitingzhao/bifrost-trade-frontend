/**
 * Panels the Pipeline drawer opens on demand.
 *
 * The progress strip, verdict strip, batch-result strip, funnel cards and
 * persona list that used to live here were replaced by HarnessPipelineStepper —
 * they rendered the run as a pile of simultaneous panels rather than a sequence.
 * What remains is detail: raw plan steps, raw trace, and run outputs.
 */
import {
  parseHarnessTrace,
  traceScanEvent,
  type ObjectiveRunDetail,
} from '@/lib/harness/harnessTrace'

export function HarnessPlanStepper({ planJson }: { planJson: Record<string, unknown> | null }) {
  const steps = Array.isArray(planJson?.steps)
    ? (planJson!.steps as Record<string, unknown>[])
    : []
  if (steps.length === 0) {
    return <p className="text-dense-meta text-muted-foreground">No plan steps recorded.</p>
  }
  return (
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
