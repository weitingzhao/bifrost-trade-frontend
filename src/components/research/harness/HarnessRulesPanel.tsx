/**
 * The trading system, rendered: what the rules are, what they did, and whether
 * that changed. Split from the stepper because it answers a different question —
 * the stepper narrates one run, this describes the policy behind every run.
 */
import { cn } from '@/lib/utils'
import { POLICY_FIELD_HELP, formatPolicyValue } from '@/lib/harness/harnessDraftHelpers'
import { num } from '@/components/research/harness/harnessFormat'
import {
  PIPELINE_STAGES,
  funnelInstrument,
  ruleDrift,
  ruleImpacts,
  ruleStanceSummary,
  traceFunnel,
  type HarnessTrace,
  type RuleDrift,
  type RuleImpact,
} from '@/lib/harness/harnessTrace'

/**
 * The policy fields that decided how this stage behaved, with what they were
 * set to on the run. Empty when the stage declares no governors, or when the
 * run carries no policy — an absent policy must read as absent, not as defaults.
 */
export function stageGovernors(
  step: string,
  policy: Record<string, unknown> | null | undefined,
): { key: string; value: unknown }[] {
  if (!policy) return []
  const stage = PIPELINE_STAGES.find((s) => s.step === step)
  if (!stage) return []
  return (stage.governedBy as readonly string[]).map((key) => ({ key, value: policy[key] }))
}

/* ------------------------------------------------------- governing policy */

/**
 * A nested policy group as one readable line.
 *
 * `layers` and `option_overlay` are objects, and `JSON.stringify` put 200
 * characters of braces and nulls into a 560px drawer — unreadable, and mostly
 * nulls, which carry no constraint at all. Null means "not set", so it is
 * dropped: what is left is what the layer actually enforces.
 *
 * Deliberately shape-agnostic. A policy group added later renders without this
 * function learning about it, which is the point of grouping in the first place.
 */
export function compactPolicyGroup(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value !== 'object') return formatPolicyValue(value)
  if (Array.isArray(value)) {
    return value.length === 0 ? 'none' : value.map((v) => formatPolicyValue(v)).join(', ')
  }
  const parts: string[] = []
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === null || v === undefined) continue
    if (typeof v === 'object') {
      const inner = compactPolicyGroup(v)
      if (inner && inner !== '—' && inner !== 'none') parts.push(`${k}(${inner})`)
      continue
    }
    if (v === false) continue
    parts.push(v === true ? k : `${k} ${formatPolicyValue(v)}`)
  }
  return parts.length === 0 ? 'all defaults' : parts.join(' · ')
}

/**
 * The knobs that produced this stage's behaviour, shown with its outcome.
 *
 * The Loop's "trading system" is its policy, and reading it as one document
 * elsewhere leaves you matching fields to effects by memory. `max_candidates: 8`
 * next to a funnel that ends at 8 explains itself.
 */
export function StageGovernors({
  step,
  policy,
}: {
  step: string
  policy: Record<string, unknown> | null | undefined
}) {
  const rows = stageGovernors(step, policy)
  if (rows.length === 0) return null
  return (
    <div className="mb-1.5 space-y-0.5 border-b border-border/40 pb-1.5">
      <p className="text-dense-caption text-muted-foreground/70">Governed by</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {rows.map((r) => (
          <span
            key={r.key}
            className="text-dense-caption"
            title={POLICY_FIELD_HELP[r.key as keyof typeof POLICY_FIELD_HELP]}
          >
            <span className="font-mono text-muted-foreground">{r.key}</span>{' '}
            <span className={r.value == null ? 'text-muted-foreground/60' : 'font-medium'}>
              {compactPolicyGroup(r.value)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- rules panel */

const RULE_KIND_TONE: Record<RuleImpact['kind'], string> = {
  gate: 'text-warning',
  advisory: 'text-muted-foreground',
  limit: 'text-info',
  off: 'text-muted-foreground/50',
}

/**
 * The trading system, and which of its rules actually selected anything.
 *
 * A settings page shows what the system is allowed to reject. This shows what it
 * rejected — and on the daily stock objective those are very different pictures:
 * sepa removes 3,431 symbols while momentum, events and the option overlay
 * remove nobody. `required: false` is not leniency, it is "never rejects", and
 * three of four layers carry it. That is the risk stance, stated as measurement
 * rather than as an adjective I would have had to invent.
 */
export function RulesImpactPanel({
  policy,
  trace,
  history,
}: {
  policy: Record<string, unknown> | null | undefined
  trace: HarnessTrace
  /** The objective's other runs, for day-over-day comparison. */
  history?: { started_at?: string | null; trace_json?: unknown }[]
}) {
  const rules = ruleImpacts(policy, trace)
  if (rules.length === 0) return null
  const advisory = rules.filter((r) => r.kind === 'advisory')
  // Compare only against days measured the same way as this run.
  const instrument = funnelInstrument(traceFunnel(trace))
  const drifts = new Map<string, RuleDrift>(
    (history ?? []).length > 0
      ? rules.map((r) => [r.key, ruleDrift(history ?? [], r.key, instrument)])
      : [],
  )
  const comparableDays = Math.max(0, ...[...drifts.values()].map((d) => d.days.length))

  return (
    <div className="mx-1.5 mb-1 space-y-1 rounded-md border border-border/50 bg-background px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-dense-label font-medium">Your rules, and what they did</span>
        <span className="text-dense-caption text-muted-foreground">
          {ruleStanceSummary(rules)}
        </span>
      </div>
      <ul className="space-y-0.5">
        {rules.map((r) => (
          <li key={r.key} className="flex items-baseline gap-2 text-dense-caption">
            <span className="w-28 shrink-0 truncate font-mono">{r.key}</span>
            <span className={cn('w-16 shrink-0 uppercase', RULE_KIND_TONE[r.kind])}>
              {r.kind}
            </span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {compactPolicyGroup(r.setting)}
            </span>
            <DriftCell drift={drifts.get(r.key)} />
            <span
              className={cn(
                'w-16 shrink-0 text-right tabular-nums',
                r.dropped == null
                  ? 'text-muted-foreground/50'
                  : r.dropped > 0
                    ? 'text-warning'
                    : 'text-muted-foreground/60',
              )}
              title={
                r.dropped == null
                  ? 'This run recorded no funnel step for this rule — not measured, which is not the same as removing nobody.'
                  : undefined
              }
            >
              {r.dropped == null ? 'not measured' : r.dropped > 0 ? `−${num(r.dropped)}` : '−0'}
            </span>
          </li>
        ))}
      </ul>
      {advisory.length > 0 ? (
        <p className="text-dense-caption text-muted-foreground/70">
          {advisory.length} of {rules.filter((r) => r.kind !== 'limit').length} layers are
          advisory — they rank, they never reject.
        </p>
      ) : null}
      {/* Drift needs two measured days. Saying so beats drawing a line whose
          only content is that the history is too short to have any. */}
      {comparableDays < 2 ? (
        <p className="text-dense-caption text-muted-foreground/60">
          {comparableDays === 0
            ? 'No comparable history yet — drift appears once a rule has been measured on two days.'
            : `Only one measured day so far. Same-day runs read one snapshot, so drift needs a second day.`}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Day-over-day change for one rule, or nothing.
 *
 * Silent under two measured days. A rule that has been measured once has no
 * drift — not a drift of zero — and a "0" here would read as "the market held
 * steady" when it means "we have not looked twice".
 */
function DriftCell({ drift }: { drift?: RuleDrift }) {
  if (!drift || drift.change == null) {
    return <span className="w-20 shrink-0" aria-hidden />
  }
  const { change, days } = drift
  const prev = days[days.length - 2]
  return (
    <span
      className={cn(
        'w-20 shrink-0 text-right tabular-nums text-dense-caption',
        change === 0 ? 'text-muted-foreground/60' : 'text-info',
      )}
      title={`${prev.day}: −${num(prev.dropped)} → today. Same rule, different market or data.`}
    >
      {change === 0 ? 'unchanged' : `${change > 0 ? '+' : ''}${num(change)} vs ${prev.day.slice(5)}`}
    </span>
  )
}

