/**
 * Which path an agent runs on — `chat`, `batch`, or both.
 *
 * Design Rev 2026-09-21.6 adds a **Path** column to the bench and the same
 * reading to the Orchestration wiring table. It is derived, not a new table
 * (the design's own instruction): a second list would be a second place to
 * forget an agent.
 *
 *   chat   — triage can hand the question to it, or it composes for a thread
 *   batch  — it runs in the review chain a candidate batch goes through, or
 *            it is what the batch runs afterwards
 *
 * Whether you can *choose* an agent is the other half of the same question
 * and deliberately a different field (`AGENT_DIRECTLY_ROUTABLE`): Verdict is
 * on the chat path but you never route a question to it — it composes its
 * brief out of the other four — and Loop Curator only runs after a batch.
 * The bench greys those rows and marks them, reading that field rather than a
 * hard-coded pair of ids.
 */
import {
  AGENT_CALLS,
  AGENT_DIRECTLY_ROUTABLE,
  AGENT_INVOKED_BY,
} from '@/lib/copilot/agentPersonaCatalog'

export type AgentPath = 'chat' | 'batch'

/**
 * The chain a candidate batch is graded by, and the agent that runs after it.
 *
 * From `research-loop-batch`: the four specialists grade, Verdict composes,
 * and the curator proposes what the batch argues for. It is the loop's shape,
 * so it is written here rather than inferred from the chat graph — the chat
 * graph cannot see a run that never opens a thread.
 */
export const BATCH_CHAIN: readonly string[] = [
  'analyze',
  'portfolio',
  'validate',
  'verdict',
  'loop_curator',
]

/** Agents triage can hand a question to, plus the composer it assembles. */
function onChatPath(agent: string): boolean {
  const invoked = AGENT_INVOKED_BY[agent] ?? []
  return invoked.some((e) => e.by === 'triage')
}

export function agentPaths(agent: string): AgentPath[] {
  const out: AgentPath[] = []
  if (onChatPath(agent)) out.push('chat')
  if (BATCH_CHAIN.includes(agent)) out.push('batch')
  return out
}

/** `chat · batch` — what the column prints; `—` when neither claims it. */
export function agentPathLabel(agent: string): string {
  const paths = agentPaths(agent)
  return paths.length === 0 ? '—' : paths.join(' · ')
}

/**
 * The bench's grey note: why you cannot pick this row, or null when you can.
 *
 * Read from the catalog's `AGENT_DIRECTLY_ROUTABLE`, never from a pair of ids
 * written into the component — the design's instruction, and the reason is
 * plain: the day a tenth agent arrives, a hard-coded pair is wrong and says
 * nothing about it.
 */
export function notRoutableNote(agent: string): string | null {
  if (AGENT_DIRECTLY_ROUTABLE[agent] !== false) return null
  return (AGENT_CALLS[agent]?.length ?? 0) > 0 ? 'composed · via triage' : 'after a batch'
}
