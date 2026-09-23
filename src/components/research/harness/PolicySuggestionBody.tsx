import { ArrowRight, Sparkles, User } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import { PolicyEvidence } from '@/components/research/harness/PolicyEvidence'
import { POLICY_FIELD_HELP, policySuggestionMergeCount } from '@/lib/harness/harnessDraftHelpers'
import { formatPolicyLeaf, policyDiffView } from '@/lib/harness/policyDiff'
import { cn } from '@/lib/utils'

/**
 * A policy suggestion, in the order a reader decides on it: who proposed it and
 * why, exactly what Approve would change, what stays as it is, then the evidence.
 *
 * The change is shown leaf by leaf against the server's own merge
 * (`lib/harness/policyDiff.ts`). Whole values side by side put three nested
 * layers of JSON in one cell and ran off the card; unchanged fields in the same
 * table showed "—" under Proposed, which read as "cleared".
 */
export function PolicySuggestionBody({
  payload,
}: {
  payload: Record<string, unknown>
}) {
  const diff = policyDiffView(payload)
  const mergeCount = policySuggestionMergeCount(payload)
  const reasoning =
    typeof payload.llm_reasoning === 'string' && payload.llm_reasoning
      ? payload.llm_reasoning
      : null
  const llmModel =
    typeof payload.llm_model === 'string' && payload.llm_model
      ? payload.llm_model
      : null
  const source =
    typeof payload.source === 'string' && payload.source ? payload.source : null
  // Owner-authored suggestions were badged "llm". Mislabelling who changed the
  // rules defeats the record the draft exists to leave.
  const byOwner = payload.manual === true
  const rationale =
    typeof payload.rationale === 'string' && payload.rationale.trim()
      ? payload.rationale.trim()
      : null
  const evidence =
    payload.evidence && typeof payload.evidence === 'object' && !Array.isArray(payload.evidence)
      ? (payload.evidence as Record<string, unknown>)
      : null
  const objectiveId =
    typeof payload.objective_id === 'string' && payload.objective_id.trim()
      ? payload.objective_id.trim()
      : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <DenseTag
          variant={byOwner ? 'category' : 'success'}
          size="cell"
          className="inline-flex items-center gap-0.5"
        >
          {byOwner ? <User className="size-3" /> : <Sparkles className="size-3" />}
          {byOwner
            ? 'you proposed this'
            : source === 'persona_eval_outcomes'
              ? 'outcome flywheel'
              : (llmModel ?? 'llm')}
        </DenseTag>
        {source ? (
          <DenseTag variant="neutral" size="cell">
            {source}
          </DenseTag>
        ) : null}
        <DenseTag variant={mergeCount > 0 ? 'warning' : 'neutral'} size="cell">
          {mergeCount > 0
            ? `${mergeCount} field${mergeCount === 1 ? '' : 's'} to merge`
            : 'nothing to merge'}
        </DenseTag>
      </div>

      {/* Why the change was proposed. Kept next to the diff because the number
          alone cannot say whether a later shift in a rule's reach was the market
          moving or this decision landing. */}
      {rationale ? (
        <p className="rounded-md border border-border/50 bg-secondary/40 px-2.5 py-1.5 text-dense-meta">
          {rationale}
        </p>
      ) : null}
      {reasoning ? <p className="max-w-prose text-dense-meta text-foreground/85">{reasoning}</p> : null}

      {/* Side by side, as the prototype draws it: what Approve changes on the
          left, what it rests on beside it — a diff read without its evidence is
          a number, and stacked they were a screen apart. One column under
          `lg`, where two would be two narrow ones. */}
      <div className={cn('grid gap-2 items-start', evidence ? 'lg:grid-cols-2' : '')}>
        <section className="rounded-md border border-border/60 bg-secondary/25 px-2.5 py-2" aria-label="What Approve changes">
          <h4 className="mb-1.5 text-dense-micro font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Diff{objectiveId ? <span className="font-mono normal-case"> → {objectiveId}</span> : null}
          </h4>
        {diff.changes.length > 0 ? (
          <table className="text-dense-meta font-mono tabular-nums">
            <thead>
              <tr className="text-left text-dense-micro text-muted-foreground">
                <th className="py-0.5 pr-4 font-medium">Approve changes</th>
                <th className="py-0.5 pr-2 font-medium">Now</th>
                <th className="py-0.5 pr-2 font-medium" aria-hidden="true" />
                <th className="py-0.5 font-medium">After</th>
              </tr>
            </thead>
            <tbody>
              {diff.changes.map((c) => (
                <tr key={c.path} className="border-t border-border/40">
                  <td
                    className="cursor-help py-0.5 pr-4 text-muted-foreground underline decoration-border decoration-dotted underline-offset-2"
                    title={POLICY_FIELD_HELP[c.key]}
                  >
                    {c.path}
                  </td>
                  <td className="py-0.5 pr-2 text-foreground/80">{formatPolicyLeaf(c.from)}</td>
                  <td className="py-0.5 pr-2 text-muted-foreground">
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </td>
                  <td className="py-0.5 font-semibold text-warning">{formatPolicyLeaf(c.to)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-dense-meta italic text-muted-foreground">No policy value would change.</p>
        )}

        {diff.unchanged.length > 0 ? (
          <details className="text-dense-micro text-muted-foreground">
            <summary className="cursor-pointer select-none">
              {diff.unchanged.length} field{diff.unchanged.length === 1 ? '' : 's'} unchanged
            </summary>
            <dl className="mt-1 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-0.5 font-mono">
              {diff.unchanged.map((u) => (
                <div key={u.key} className="contents">
                  <dt title={POLICY_FIELD_HELP[u.key]}>{u.key}</dt>
                  <dd className="break-all text-foreground/70">{formatPolicyLeaf(u.value)}</dd>
                </div>
              ))}
            </dl>
          </details>
        ) : null}

        </section>

        {evidence ? (
          <section className="rounded-md border border-border/60 bg-secondary/25 px-2.5 py-2" aria-label="What the suggestion rests on">
            <h4 className="mb-1.5 text-dense-micro font-semibold uppercase tracking-[0.08em] text-muted-foreground">Evidence · what this rests on</h4>
            <PolicyEvidence evidence={evidence} />
          </section>
        ) : null}
      </div>

      {mergeCount > 0 ? (
        <p className="text-dense-micro text-muted-foreground">
          Approve merges these fields into{' '}
          <code className="font-mono">objective.policy_json</code>{' '}
          (whitelist-filtered).
        </p>
      ) : (
        // Saying "Approve merges these fields" when none of them changed is the
        // kind of promise that trains you to approve without reading.
        <p className="text-dense-micro text-muted-foreground">
          Nothing whitelist-eligible changed — Approve would write no field to{' '}
          <code className="font-mono">objective.policy_json</code>. Read the
          reasoning, then dismiss.
        </p>
      )}
    </div>
  )
}
