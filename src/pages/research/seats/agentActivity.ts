import type { AiDraft } from '@/api/researchDrafts'

/**
 * Which scheduled agents wrote today, and what they wrote.
 *
 * Design (`design/trade/Research Copilot.dc.html`) calls this "Ran today ·
 * scheduled agents" with Agent / When / Produced / Cost. The first three are
 * derivable from drafts the agents already write — `generated_by`,
 * `created_at`, `kind` — so this reads the same rows the Decision Inbox reads
 * rather than a second table that could disagree with it.
 *
 * Cost is recorded per objective run, not per agent, and a draft that came out
 * of a run names it in `payload.run_id`. So a row carries the runs its drafts
 * link, and the page sums what those runs spent. A row whose drafts link none —
 * the EOD and morning agents, the curator's verdicts — has no recorded spend,
 * and is reported as absent rather than as zero. (This file used to say no
 * agent run recorded spend at all, which was true of those agents and false of
 * the Autopilot runs.)
 *
 * It says *wrote*, not *ran*. A run boundary is not recorded: one EOD pass
 * produces forty-odd verdicts and nothing marks where it started. Agent-level
 * is the finest grain the data actually supports, so that is the grain used —
 * claiming runs would put a line where there is no evidence of one.
 */

export interface AgentActivityRow {
  /** `generated_by` — eod_agent, digest_agent, curator_agent, harness … */
  agent: string
  /** The most recent write today, ISO. */
  lastAt: string
  /** What it wrote, commonest first. */
  produced: { kind: string; n: number }[]
  writes: number
  /** Objective runs today's drafts came out of — where this row's spend is recorded. Sorted, distinct. */
  runIds: string[]
}

/**
 * The ET calendar date of an instant, `YYYY-MM-DD`.
 *
 * ET because the trading day is ET and the design labels the section with it.
 * Built from parts rather than a locale string: the same locale formats dates
 * differently across runtimes, and a day boundary is not a place to find that
 * out.
 */
export function nyDate(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** `eod_verdict` → `eod verdict`. */
export function humanKind(kind: string): string {
  return kind.replace(/_/g, ' ')
}

export function agentsThatWroteOn(
  drafts: readonly AiDraft[],
  day: string,
): AgentActivityRow[] {
  const byAgent = new Map<string, { lastAt: string; kinds: Map<string, number>; runIds: Set<string> }>()

  for (const draft of drafts) {
    if (!draft.created_at) continue
    const at = new Date(draft.created_at)
    if (Number.isNaN(at.getTime()) || nyDate(at) !== day) continue

    const agent = draft.generated_by || 'unattributed'
    const entry = byAgent.get(agent) ?? { lastAt: draft.created_at, kinds: new Map(), runIds: new Set() }
    if (draft.created_at > entry.lastAt) entry.lastAt = draft.created_at
    entry.kinds.set(draft.kind, (entry.kinds.get(draft.kind) ?? 0) + 1)
    const runId = draft.payload?.run_id
    if (typeof runId === 'string' && runId) entry.runIds.add(runId)
    byAgent.set(agent, entry)
  }

  return [...byAgent.entries()]
    .map(([agent, e]) => ({
      agent,
      lastAt: e.lastAt,
      writes: [...e.kinds.values()].reduce((a, b) => a + b, 0),
      runIds: [...e.runIds].sort(),
      produced: [...e.kinds.entries()]
        .map(([kind, n]) => ({ kind, n }))
        .sort((a, b) => b.n - a.n || a.kind.localeCompare(b.kind)),
    }))
    // Most recent first: what just ran is what you are checking on.
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

/**
 * One run's spend as the page knows it: dollars, still fetching, no longer kept
 * by the Research service, or failed to load.
 */
export type RunCost = number | 'loading' | 'gone' | 'error'

export type RowCost =
  | { state: 'unrecorded' }
  | { state: 'loading' }
  | { state: 'gone'; runs: number }
  | { state: 'unreadable'; runs: number }
  | { state: 'total'; usd: number; runs: number; unread: number }

/**
 * What a row cost, or why it cannot say.
 *
 * Five answers, not one number. A row whose drafts link no run has no recorded
 * spend. A row whose runs are all gone — the Research service answers 404 for
 * them, because drafts outlive runs — had spend that went with the run. A row
 * whose runs failed to load for any other reason has spend that could not be
 * read. Neither of those is $0.00: the first version printed "$0.00+" for them,
 * a floor of zero from nothing. Only when at least one run was read is there a
 * total, and a partial one counts what it is missing so the page can mark it a
 * floor.
 */
export function rowCost(runIds: readonly string[], costByRun: ReadonlyMap<string, RunCost>): RowCost {
  if (runIds.length === 0) return { state: 'unrecorded' }
  const costs = runIds.map((id) => costByRun.get(id) ?? 'loading')
  if (costs.includes('loading')) return { state: 'loading' }
  const known = costs.filter((c): c is number => typeof c === 'number')
  if (known.length === 0) {
    return costs.every((c) => c === 'gone')
      ? { state: 'gone', runs: runIds.length }
      : { state: 'unreadable', runs: runIds.length }
  }
  return {
    state: 'total',
    usd: known.reduce((a, b) => a + b, 0),
    runs: runIds.length,
    unread: costs.length - known.length,
  }
}

