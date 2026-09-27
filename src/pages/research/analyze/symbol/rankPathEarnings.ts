/**
 * Earnings on the IV rank panel's 60-session path — the Symbol page's only
 * IV-through-time picture. A print inside the window lights its filing
 * session amber; a late estimate is marked faintly where it should have
 * landed. The print still to come — the next estimate, or the late one — is
 * named in the strip's key, with the estimate's caveat or the late lead on
 * hover.
 *
 * The narrative route's dates are filings, not prints: an amendment a few
 * days after the release would light a second bar, so a filing within a week
 * of the one before it folds into that one.
 */
import type { ExpectedEarnings } from '@/api/research/narrative'
import { estimateCaveat, lateLead, shortDate } from '@/utils/earningsEstimate'

/** Filings this close to the one before are the same print. */
const SAME_PRINT_DAYS = 7
/** A filing on a weekend or holiday lands on the next session within this many days. */
const SESSION_SLACK_DAYS = 4

export interface RankPathMark {
  kind: 'print' | 'late'
  title: string
}

export interface RankPathEarnings {
  /** One slot per session, in order; null where nothing is marked. */
  marks: (RankPathMark | null)[]
  /** Print dates marked inside the window, oldest first, for the strip's key. */
  printed: string[]
  /** The print still to come: the next estimate (past the right edge) or a late one. */
  pending: { label: string; title: string; late: boolean } | null
}

function dayGap(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** The first session on or after the date, when it comes within the slack. */
function sessionOf(sessions: readonly (string | null)[], date: string): number {
  const i = sessions.findIndex((s) => s != null && s >= date)
  if (i < 0) return -1
  return dayGap(date, sessions[i] as string) <= SESSION_SLACK_DAYS ? i : -1
}

function foldFilings(filings: readonly string[]): string[] {
  const out: string[] = []
  for (const d of [...filings].sort()) {
    const prev = out[out.length - 1]
    if (prev == null || dayGap(prev, d) > SAME_PRINT_DAYS) out.push(d)
  }
  return out
}

export function rankPathEarnings(
  sessions: readonly (string | null)[],
  filings: readonly string[],
  next: ExpectedEarnings | null | undefined
): RankPathEarnings {
  const marks: (RankPathMark | null)[] = sessions.map(() => null)
  const printed: string[] = []
  for (const d of foldFilings(filings)) {
    const i = sessionOf(sessions, d)
    if (i < 0) continue
    const s = sessions[i] as string
    marks[i] = {
      kind: 'print',
      title: `Earnings ${shortDate(d)} — 8-K Item 2.02 filed ${d}${s === d ? '' : `; first session ${s}`}`,
    }
    printed.push(d)
  }
  let pending: RankPathEarnings['pending'] = null
  if (next && next.days_away < 0) {
    const i = sessionOf(sessions, next.date)
    if (i >= 0 && marks[i] == null) marks[i] = { kind: 'late', title: lateLead(next) }
    pending = { label: `E ~${shortDate(next.date)}? late`, title: lateLead(next), late: true }
  } else if (next) {
    pending = {
      label: `E ~${shortDate(next.date)} · ${next.days_away}d →`,
      title: `Next earnings estimated ${next.date}. ${estimateCaveat(next)}`,
      late: false,
    }
  }
  return { marks, printed, pending }
}
