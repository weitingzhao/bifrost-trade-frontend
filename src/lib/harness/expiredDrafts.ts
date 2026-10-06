/**
 * Expired drafts in the Decision Inbox (design Rev .156, ASK decision-inbox
 * wording §6). A draft expires when a newer draft on the same hypothesis or
 * objective replaces it, or when its `expires_at` passes; approve / dismiss
 * then answer 409. The card stays where it was, inert: a neutral `expired`
 * tag, no Approve / Dismiss, one muted line saying why, `Open newer →` when it
 * was replaced, and it is not counted as waiting.
 *
 * Research records why on the row: `payload.expired = { reason, at,
 * superseded_by }` (repositories/ai_draft.py `expired_state`).
 */
import type { AiDraft } from '@/api/researchDrafts'

export interface ExpiredInfo {
  /** `replaced` — a newer draft took its place; `due` — its expiry passed (or any other recorded reason). */
  why: 'replaced' | 'due'
  /** The newer draft's id, when it was replaced. */
  by: string | null
  /** When it expired (ISO), or null when the row does not say. */
  at: string | null
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

export function expiredInfo(d: AiDraft): ExpiredInfo {
  const rec = d.payload.expired
  const r = rec && typeof rec === 'object' ? (rec as Record<string, unknown>) : {}
  const by = str(r.superseded_by)
  const reason = str(r.reason)
  return {
    why: by || reason === 'superseded' ? 'replaced' : 'due',
    by,
    at: str(r.at) ?? str(r.expired_at) ?? d.expires_at ?? null,
  }
}

/** How long an expired card stays on the page after it expired. */
export const EXPIRED_SHOWN_DAYS = 3

/** Expired drafts recent enough to keep in place, newest first. Rows with no date are left off. */
export function recentExpired(rows: readonly AiDraft[], now: Date, days = EXPIRED_SHOWN_DAYS): AiDraft[] {
  const since = now.getTime() - days * 86_400_000
  return rows
    .filter((d) => d.status === 'expired')
    .map((d) => ({ d, at: Date.parse(expiredInfo(d).at ?? '') }))
    .filter((x) => Number.isFinite(x.at) && x.at >= since)
    .sort((a, b) => b.at - a.at)
    .map((x) => x.d)
}

/** The card's one line: `A newer draft replaced it` · `Expired Mon 5 Oct`. */
export function expiredLine(info: ExpiredInfo): string {
  if (info.why === 'replaced') return 'A newer draft replaced it'
  const t = Date.parse(info.at ?? '')
  if (!Number.isFinite(t)) return 'Expired'
  const day = new Date(t).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/New_York',
  })
  // en-US gives `Mon, Oct 5`; the design writes `Mon 5 Oct`.
  const [wd, rest] = day.split(', ')
  const [mon, dd] = (rest ?? '').split(' ')
  return dd ? `Expired ${wd} ${dd} ${mon}` : `Expired ${day}`
}
