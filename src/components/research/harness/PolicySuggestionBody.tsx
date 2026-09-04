import { ArrowRight, Sparkles } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import {
  computePolicySuggestionRows,
  formatPolicyValue,
  POLICY_FIELD_HELP,
  policySuggestionMergeCount,
} from '@/lib/harness/harnessDraftHelpers'
import { cn } from '@/lib/utils'

export function PolicySuggestionBody({
  payload,
}: {
  payload: Record<string, unknown>
}) {
  const rows = computePolicySuggestionRows(payload)
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
  const evidence =
    payload.evidence && typeof payload.evidence === 'object' && !Array.isArray(payload.evidence)
      ? (payload.evidence as Record<string, unknown>)
      : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <DenseTag variant="success" size="cell" className="inline-flex items-center gap-0.5">
          <Sparkles className="size-3" />
          {source === 'persona_eval_outcomes'
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

      {evidence ? (
        <p className="text-dense-micro text-muted-foreground">
          Evidence from recent Persona eval:{' '}
          <code className="font-mono">{JSON.stringify(evidence)}</code>
        </p>
      ) : null}

      {/*
        Reasoning and diff are one thought — what the model concluded and what it
        would write. Stacked they push the card tall and leave the right half of
        a wide canvas empty; side by side they read together. Both cap their own
        width so neither follows the card out to 1280px.
      */}
      <div className="flex flex-col gap-x-6 gap-y-2 lg:flex-row lg:items-start">
      {reasoning ? (
        <blockquote className="max-w-prose lg:flex-1 border-l-2 border-border/60 pl-2 text-dense-meta italic text-foreground/80">
          {reasoning}
        </blockquote>
      ) : null}

      {rows.length > 0 ? (
        <table className="w-full max-w-xl lg:shrink-0 text-dense-meta font-mono tabular-nums">
          <thead>
            <tr className="text-left text-dense-micro text-muted-foreground">
              <th className="font-medium py-0.5 pr-2">Field</th>
              <th className="font-medium py-0.5 pr-2">Current</th>
              <th className="font-medium py-0.5 pr-2" aria-hidden="true">
                {' '}
              </th>
              <th className="font-medium py-0.5">Proposed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className={cn(
                  'border-t border-border/40',
                  row.changed ? 'bg-warning/5' : '',
                )}
              >
                <td
                  className="py-0.5 pr-2 text-muted-foreground underline decoration-dotted decoration-border underline-offset-2 cursor-help"
                  title={POLICY_FIELD_HELP[row.key]}
                >
                  {row.key}
                </td>
                <td className="py-0.5 pr-2 text-foreground/80">
                  {formatPolicyValue(row.current)}
                </td>
                <td className="py-0.5 pr-2 text-muted-foreground">
                  <ArrowRight className="size-3" aria-hidden="true" />
                </td>
                <td
                  className={cn(
                    'py-0.5',
                    row.changed
                      ? 'text-warning font-semibold'
                      : 'text-foreground/80',
                  )}
                >
                  {formatPolicyValue(row.proposed)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-dense-meta text-muted-foreground italic">
          No policy fields to change.
        </p>
      )}
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
