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
