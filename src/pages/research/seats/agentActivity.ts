import type { AiDraft } from '@/api/researchDrafts'

/**
 * Which scheduled agents wrote today, and what they wrote.
 *
 * Design (`design/trade/Research Copilot.dc.html`) calls this "Ran today ·
 * scheduled agents" with Agent / When / Produced / Cost. Three of those four
 * are derivable from drafts the agents already write — `generated_by`,
 * `created_at`, `kind` — so this reads the same rows the Decision Inbox reads
 * rather than a second table that could disagree with it. The fourth is not
 * recorded anywhere in this system and is reported as absent, not as zero.
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
  const byAgent = new Map<string, { lastAt: string; kinds: Map<string, number> }>()

  for (const draft of drafts) {
    if (!draft.created_at) continue
    const at = new Date(draft.created_at)
    if (Number.isNaN(at.getTime()) || nyDate(at) !== day) continue

    const agent = draft.generated_by || 'unattributed'
    const entry = byAgent.get(agent) ?? { lastAt: draft.created_at, kinds: new Map() }
    if (draft.created_at > entry.lastAt) entry.lastAt = draft.created_at
    entry.kinds.set(draft.kind, (entry.kinds.get(draft.kind) ?? 0) + 1)
    byAgent.set(agent, entry)
  }

  return [...byAgent.entries()]
    .map(([agent, e]) => ({
      agent,
      lastAt: e.lastAt,
      writes: [...e.kinds.values()].reduce((a, b) => a + b, 0),
      produced: [...e.kinds.entries()]
        .map(([kind, n]) => ({ kind, n }))
        .sort((a, b) => b.n - a.n || a.kind.localeCompare(b.kind)),
    }))
    // Most recent first: what just ran is what you are checking on.
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}
