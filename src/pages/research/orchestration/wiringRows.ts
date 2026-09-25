/**
 * The wiring table's rows: every agent, who calls it, and how.
 *
 * One row per agent, built from the catalog — the same graph the diagram
 * draws, read as a table so it can be filtered by path (design Rev
 * 2026-09-21.1). Nothing here is typed twice: `Called by` and `How` come off
 * `AGENT_INVOKED_BY`, `It calls` off `AGENT_CALLS`, and `Path` off the same
 * `agentPaths` the bench prints.
 */
import { agentPaths, type AgentPath } from '@/lib/copilot/agentPaths'
import {
  AGENT_CALLS,
  AGENT_GUARDRAILS,
  AGENT_INVOKED_BY,
  AGENT_ROLE_KIND,
  type AgentRoleKind,
  type InvokedBy,
} from '@/lib/copilot/agentPersonaCatalog'

export interface WiringRow {
  agent: string
  role: AgentRoleKind
  invokedBy: InvokedBy[]
  calls: string[]
  paths: AgentPath[]
  /** The one thing worth saying about this row, or null. */
  note: string | null
}

export type PathFilter = 'all' | AgentPath

export function wiringRows(agents: readonly string[]): WiringRow[] {
  return agents.map((agent) => ({
    agent,
    role: AGENT_ROLE_KIND[agent] ?? 'specialist',
    invokedBy: AGENT_INVOKED_BY[agent] ?? [],
    calls: (AGENT_CALLS[agent] ?? []).map((c) => c.to),
    paths: agentPaths(agent),
    // The neutral mandate is why Validate agrees least and weighs most; the
    // design calls it out in the footnote, and the row is where it belongs.
    note: AGENT_GUARDRAILS[agent]?.neutralAppendix ? 'neutral mandate' : null,
  }))
}

export function filterByPath(rows: readonly WiringRow[], path: PathFilter): WiringRow[] {
  if (path === 'all') return [...rows]
  return rows.filter((r) => r.paths.includes(path))
}

/** `14 edges` — what the header counts, so a filter visibly narrows it. */
export function edgeCount(rows: readonly WiringRow[]): number {
  return rows.reduce((n, r) => n + r.invokedBy.length + r.calls.length, 0)
}

export interface PersonaPathReading {
  /** `agents` · `heuristic`, or `—` when nothing says which. */
  value: string
  /** Where the reading came from, or why there is none. */
  note: string
}

/**
 * "Persona eval path" under How it is wired (design Rev .48 Q1): read live
 * from research `/health · persona_eval_agents`. A research API older than
 * 0.112.0 does not report it, and that is said rather than guessed — the
 * heuristic is the code's default, not a reading.
 */
export function personaPathReading(
  health: { version: string; persona_eval_agents?: boolean } | undefined,
  failed: boolean,
): PersonaPathReading {
  if (failed) return { value: '—', note: 'research /health did not answer' }
  if (health == null) return { value: '—', note: 'reading research /health…' }
  if (health.persona_eval_agents == null) {
    return { value: '—', note: `research ${health.version} does not report it — 0.112.0 and later do` }
  }
  const src = `live · research /health · persona_eval_agents = ${String(health.persona_eval_agents)}`
  return health.persona_eval_agents
    ? { value: 'agents', note: `${src} — this API process; the harness CronJob sets its own copy` }
    : // The design adds "never a prod default"; DEV's research-api sets the
      // flag, so the line says only what holds everywhere.
      { value: 'heuristic', note: `${src} — agents need BIFROST_PERSONA_EVAL_AGENTS=1; the code's default is the heuristic` }
}
