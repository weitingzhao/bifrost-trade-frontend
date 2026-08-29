import { ArrowRight, Sparkles } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import {
  computePolicySuggestionRows,
  formatPolicyValue,
} from '@/lib/harness/harnessDraftHelpers'
import { cn } from '@/lib/utils'

export function PolicySuggestionBody({
  payload,
}: {
  payload: Record<string, unknown>
}) {
  const rows = computePolicySuggestionRows(payload)
  const changed = rows.filter((r) => r.changed)
  const reasoning =
    typeof payload.llm_reasoning === 'string' && payload.llm_reasoning
      ? payload.llm_reasoning
      : null
  const llmModel =
    typeof payload.llm_model === 'string' && payload.llm_model
      ? payload.llm_model
      : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <DenseTag variant="success" size="cell">
          <Sparkles className="size-3 mr-0.5" />
          {llmModel ?? 'llm'}
        </DenseTag>
        <DenseTag variant="neutral" size="cell">
          {changed.length} field{changed.length === 1 ? '' : 's'} to merge
        </DenseTag>
      </div>

      {reasoning ? (
        <blockquote className="border-l-2 border-border/60 pl-2 text-dense-meta italic text-foreground/80">
          {reasoning}
        </blockquote>
      ) : null}

      {rows.length > 0 ? (
        <table className="w-full text-dense-meta font-mono tabular-nums">
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
                <td className="py-0.5 pr-2 text-muted-foreground">{row.key}</td>
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

      <p className="text-dense-micro text-muted-foreground">
        Approve merges these fields into{' '}
        <code className="font-mono">objective.policy_json</code>{' '}
        (whitelist-filtered).
      </p>
    </div>
  )
}
