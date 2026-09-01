import { DenseTag } from '@/components/data-display'
import {
  parseHarnessTrace,
  runDurationMs,
  statusVariant,
  traceFunnel,
  traceScanEvent,
  type ObjectiveRunDetail,
} from '@/lib/harness/harnessTrace'

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function HarnessRunVerdictStrip({ run }: { run: ObjectiveRunDetail }) {
  const trace = parseHarnessTrace(run.trace_json)
  const scan = traceScanEvent(trace)
  const plan = run.plan_json as Record<string, unknown> | null
  const generatedBy =
    typeof plan?.generated_by === 'string' ? plan.generated_by : '—'
  const universeMode =
    (typeof scan?.universe_mode === 'string' && scan.universe_mode) ||
    (typeof run.outputs?.universe_mode === 'string' && run.outputs.universe_mode) ||
    (typeof run.outputs?.data_source === 'string' && run.outputs.data_source) ||
    '—'
  const dataSource =
    typeof run.outputs?.data_source === 'string' ? run.outputs.data_source : '—'

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-secondary/50 px-3 py-2">
      <DenseTag variant={statusVariant(run.status)} size="cell">
        {run.status}
      </DenseTag>
      <span className="text-dense-meta text-muted-foreground">
        {run.objective_title ?? run.objective_id}
      </span>
      <DenseTag variant="neutral" size="cell">
        {universeMode}
      </DenseTag>
      <DenseTag variant="category" size="cell">
        source: {dataSource}
      </DenseTag>
      <span className="text-dense-caption text-muted-foreground">
        plan: {generatedBy} · {fmtDuration(runDurationMs(run.started_at, run.finished_at))}
      </span>
      <span className="font-mono text-dense-micro text-muted-foreground truncate max-w-[12rem]">
        {run.id}
      </span>
    </div>
  )
}

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

export function HarnessFunnelPanel({ traceJson }: { traceJson: unknown }) {
  const funnel = traceFunnel(parseHarnessTrace(traceJson))
  if (funnel.length === 0) {
    return (
      <p className="text-dense-meta text-muted-foreground">
        No funnel steps — legacy scan or empty universe.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {funnel.map((step) => (
        <div
          key={step.name}
          className="rounded-md border border-border/50 bg-background px-2 py-1.5 space-y-1"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-dense-label font-medium">{step.name}</span>
            <DenseTag variant="neutral" size="cell">
              {step.in_count} → {step.out_count}
            </DenseTag>
            {step.skipped ? (
              <DenseTag variant="warning" size="cell">
                skipped
              </DenseTag>
            ) : null}
            {step.optional ? (
              <DenseTag variant="category" size="cell">
                optional
              </DenseTag>
            ) : null}
          </div>
          {step.filter ? (
            <p className="text-dense-caption text-muted-foreground">{step.filter}</p>
          ) : null}
          {step.skip_reason ? (
            <p className="text-dense-caption text-warning">{step.skip_reason}</p>
          ) : null}
          {step.dropped_sample && step.dropped_sample.length > 0 ? (
            <p className="text-dense-micro text-muted-foreground font-mono truncate">
              dropped sample: {step.dropped_sample.join(', ')}
            </p>
          ) : null}
        </div>
      ))}
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
