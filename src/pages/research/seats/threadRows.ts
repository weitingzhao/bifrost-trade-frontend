/**
 * Threads on the Copilot Desk — the parts of the design's table this app can
 * answer, as pure functions.
 *
 * Design (`design/trade/Research Copilot.dc.html`, Threads) has Thread, Origin,
 * Symbol, Persona, Turns, Writes, Cost, Last, and a filter of All / Today /
 * Pinned / With writes. What a session actually records decides which of those
 * exist here:
 *
 * - Origin and Symbol: not recorded. The page context a question was asked from
 *   is sent with the turn (`client_context`) and not kept.
 * - Writes: `ai_action_log` carries `session_id`, but no read endpoint lists it.
 * - Cost: the chat's spend is a per-day counter in process memory
 *   (`copilot/rate_limit.py`), not a per-session record.
 * - Persona: `agent_trail` is written by nothing and empty on DEV — but every
 *   assistant frame names the `agent` that spoke, which is the answer.
 *
 * So this file does Persona and the three filters that need nothing else.
 */
import type { CopilotSessionSummary, PersistedCopilotFrame } from '@/api/researchCopilotSessions'
import { nyDate } from '@/pages/research/seats/agentActivity'

/**
 * Who answered a thread: the specialists that spoke, in the order they first
 * did; `triage` when it answered alone; null when no agent spoke at all — a
 * thread whose only frame is the question, as when the chosen model had no key.
 */
export function threadPersona(frames: readonly PersistedCopilotFrame[]): string[] | null {
  const spoke = [...new Set(frames.map((f) => f.agent).filter((a): a is string => Boolean(a)))]
  if (spoke.length === 0) return null
  const specialists = spoke.filter((a) => a !== 'triage')
  return specialists.length > 0 ? specialists : ['triage']
}

/**
 * How many times the reader asked. `message_count` on the list counts every
 * frame — tool calls, tool results, handoffs — so a 41-frame run review read
 * as 41 turns. A turn is a question: a user text frame.
 */
export function threadTurns(frames: readonly PersistedCopilotFrame[]): number {
  return frames.filter((f) => f.role === 'user' && (f.kind ?? 'text') === 'text').length
}

export type ThreadFilter = 'all' | 'today' | 'pinned'

export const THREAD_FILTERS: { value: ThreadFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'pinned', label: 'Pinned' },
]

/** Whether a thread belongs under a filter. "Today" is the ET trading day, as everywhere on the Desk. */
export function threadInFilter(
  row: Pick<CopilotSessionSummary, 'pinned' | 'updated_at'>,
  filter: ThreadFilter,
  today: string,
): boolean {
  if (filter === 'pinned') return Boolean(row.pinned)
  if (filter === 'today') {
    if (!row.updated_at) return false
    const at = new Date(row.updated_at)
    return !Number.isNaN(at.getTime()) && nyDate(at) === today
  }
  return true
}
