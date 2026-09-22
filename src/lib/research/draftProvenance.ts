/**
 * Where a draft came from, for the card that asks you to approve it.
 *
 * The design's patch card (Rev 2026-09-18.2) closes with a provenance line —
 * `parent · … · thread · … · Journal →` — because a merge proposal is only as
 * good as what it was distilled from, and the reader should be one click from
 * it.
 *
 * Two of the three exist on this side, and the third does not:
 *
 * - **parent** is the artifact the draft is about, read the way the Journal
 *   reads it (it was `journalModel`'s until the card became its second
 *   reader): the hypothesis it judges, the candidate it promotes, the run it
 *   came out of, or its scope.
 * - **thread** is null for every draft on DEV, measured 2026-09-21 over 60
 *   pending: they are written by `eod_agent`, `harness`, `digest_agent` and
 *   `weekly_policy_review`, and nothing here distils a patch out of a Copilot
 *   thread yet. The field is kept so the line fills itself the day something
 *   does, and the card says so rather than leaving a blank.
 * - **Journal** is a link: the Journal keys a draft node by the draft's own
 *   id and reads `?sel=`.
 */
import type { AiDraft } from '@/api/researchDrafts'

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

/** The artifact this draft is about — the Journal's own rule, one copy. */
export function draftParentId(d: Pick<AiDraft, 'payload' | 'scope'>): string | null {
  const p = (d.payload ?? {}) as Record<string, unknown>
  return str(p.hypothesis_id) ?? str(p.candidate_id) ?? str(p.run_id) ?? str(d.scope)
}

/** The Copilot thread a patch was distilled from, when one was. */
export function draftThreadId(d: Pick<AiDraft, 'payload'>): string | null {
  const p = (d.payload ?? {}) as Record<string, unknown>
  return str(p.thread_id) ?? str(p.session_id)
}

/** That draft, as a node in the Journal. */
export function draftJournalHref(id: string): string {
  return `/research/journal?sel=${encodeURIComponent(id)}`
}
