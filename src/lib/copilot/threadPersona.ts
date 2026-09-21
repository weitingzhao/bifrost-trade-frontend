/**
 * Who answered a thread.
 *
 * The specialists that spoke, in the order they first did; `triage` when it
 * answered alone; null when no agent spoke at all — a thread whose only frame
 * is the question, as when the chosen model had no key.
 *
 * It takes anything carrying an `agent`, because the two readers hold the
 * thread in different shapes: the Threads table reads persisted frames, and
 * the dock reads the messages it has hydrated or streamed. One rule, so the
 * table's PERSONA column and the dock's header chip cannot disagree about who
 * is answering (design Rev 2026-09-20.20: the dock header reads `as
 * vol_desk`).
 */
export function threadPersona(spoke: readonly { agent?: string }[]): string[] | null {
  const agents = [...new Set(spoke.map((f) => f.agent).filter((a): a is string => Boolean(a)))]
  if (agents.length === 0) return null
  const specialists = agents.filter((a) => a !== 'triage')
  return specialists.length > 0 ? specialists : ['triage']
}
