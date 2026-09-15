/**
 * Threads on the Copilot Desk — the parts of the design's table this app can
 * answer, as pure functions.
 *
 * Design (`design/trade/Research Copilot.dc.html`, Threads) has Thread, Origin,
 * Symbol, Persona, Turns, Writes, Cost, Last, and a filter of All / Today /
 * Pinned / With writes. What a session actually records decides which of those
 * exist here:
 *
 * - Origin and Symbol: first-turn `client_context` → `origin_page` /
 *   `origin_label` / `origin_symbol` on the session (D1). Old threads stay `—`.
 * - Writes: `ai_action_log` carries `session_id`, but no read endpoint lists it
 *   until D2.
 * - Cost: ``chat_turn`` rows on ``ai_action_log`` → ``cost_usd`` (D3).
 * - Persona: assistant frames name the `agent` that spoke.
 *
 * So this file does Persona and the filters that need nothing else.
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
 * How many times the reader asked. Prefer server ``turns`` (D5); fall back to
 * counting user text frames when an older API omits the field.
 */
export function threadTurns(
  frames: readonly PersistedCopilotFrame[],
  row?: Pick<CopilotSessionSummary, 'turns'>,
): number {
  if (row && typeof row.turns === 'number' && Number.isFinite(row.turns)) return row.turns
  return frames.filter((f) => f.role === 'user' && (f.kind ?? 'text') === 'text').length
}

export type ThreadFilter = 'all' | 'today' | 'pinned' | 'with_writes'

export const THREAD_FILTERS: { value: ThreadFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'pinned', label: 'Pinned' },
  { value: 'with_writes', label: 'With writes' },
]

/** Latest threads the Desk shows when the search box is empty. */
export const DESK_THREADS_LIMIT = 12
/** API cap (`list_sessions` max 50). Search is for old threads, so take the cap. */
export const DESK_THREADS_SEARCH_LIMIT = 50

/** Which list call the Desk should make for the current search box. */
export function deskThreadsQuery(search: string): { limit: number; q: string } {
  const q = search.trim()
  return { limit: q ? DESK_THREADS_SEARCH_LIMIT : DESK_THREADS_LIMIT, q }
}

/** Total write actions recorded against a thread (any status). */
export function threadWriteCount(row: Pick<CopilotSessionSummary, 'writes'>): number {
  const w = row.writes
  if (!w) return 0
  return Object.values(w).reduce((a, n) => a + (Number.isFinite(n) ? n : 0), 0)
}

/** Chat spend for a thread; null when the ledger has no chat_turn rows yet. */
export function threadCostUsd(row: Pick<CopilotSessionSummary, 'cost_usd'>): number | null {
  const c = row.cost_usd
  if (c == null || !Number.isFinite(c) || c <= 0) return null
  return c
}

/** Whether a thread belongs under a filter. "Today" is the ET trading day, as everywhere on the Desk. */
export function threadInFilter(
  row: Pick<CopilotSessionSummary, 'pinned' | 'updated_at' | 'writes'>,
  filter: ThreadFilter,
  today: string,
): boolean {
  if (filter === 'pinned') return Boolean(row.pinned)
  if (filter === 'with_writes') return threadWriteCount(row) > 0
  if (filter === 'today') {
    if (!row.updated_at) return false
    const at = new Date(row.updated_at)
    return !Number.isNaN(at.getTime()) && nyDate(at) === today
  }
  return true
}
