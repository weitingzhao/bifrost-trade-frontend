/**
 * What an AsofTag says — pure, so its claims are tested (contract §2.1, Shell
 * Spec §17).
 *
 * Two halves from two answers, both the service's:
 *
 * - **asof** is a session date the Research service stamped on the readings the
 *   view shows. A view that mixes readings shows the oldest (§17.2 rule 3).
 *   `/research/signal-health` has no session date to offer: its `as_of` is when
 *   the check ran, and `max_computed_at` is compute time — DEV recomputed option
 *   metrics on Sunday 2026-09-13, which would read as a Sunday session.
 * - **flag** is signal-health's `overall` (Design, 2026-09-13 ⑤: a verdict the
 *   service computed counts), plus lenses the server itself reports as failed.
 *   Exhibit `freshness` is *not* used: on DEV the same NVDA session came back
 *   four lenses `stale` and two `fresh`, so it says nothing about which session
 *   a view is on.
 *
 * Nothing here decides whether data is late. HOLDING needs the session that
 * should have landed, and no service reports one yet; computing it from a
 * calendar in the browser would be the client making the judgement §2.1
 * reserves for the service. So `asofHolding` only reads what it is given.
 */
import type { ExhibitPayload } from '@/api/research/exhibit'
import { exhibitFailed } from '@/api/research/exhibit'
import type { SignalHealthResponse } from '@/api/research/similarRegime'

export type FlagTone = 'warning' | 'muted'

export interface AsofFlag {
  flag: string
  detail: string
  tone: FlagTone
}

const DATE = /^\d{4}-\d{2}-\d{2}/

/** The oldest session among readings that have one, `YYYY-MM-DD`; null when none does. */
export function oldestAsof(readings: readonly { as_of?: string | null }[]): string | null {
  const dates = readings
    .map((r) => r.as_of)
    .filter((d): d is string => typeof d === 'string' && DATE.test(d))
    .map((d) => d.slice(0, 10))
    .sort()
  return dates[0] ?? null
}

function firstLine(text: string): string {
  return text.split('\n')[0].trim()
}

/**
 * The service's verdict as a flag, or null when it is `ok`.
 *
 * Not knowing is said, not hidden: while the check is still running the flag
 * reads CHECKING, and when it did not answer, UNKNOWN. A missing flag is read
 * as all-clear, so it is only missing when the service said so.
 */
export function healthFlag(
  health: Pick<SignalHealthResponse, 'overall' | 'freshness' | 'extra_tables'> | undefined,
  state: { loading?: boolean; error?: boolean } = {},
): AsofFlag | null {
  if (!health) {
    if (state.error) return { flag: 'UNKNOWN', detail: 'Signal health did not answer', tone: 'warning' }
    return { flag: 'CHECKING', detail: 'Signal health is still being read', tone: 'muted' }
  }
  if (health.overall === 'ok') return null
  const off = [...(health.freshness ?? []), ...(health.extra_tables ?? [])].filter((t) => t.status !== 'fresh')
  const detail =
    off.length > 0
      ? off.map((t) => `${t.label} ${t.status}${t.error ? ` (${firstLine(t.error)})` : ''}`).join(' · ')
      : `overall ${health.overall}`
  return { flag: health.overall.toUpperCase(), detail, tone: 'warning' }
}

/** Lenses the server stubbed because their builder threw — a failure it reported, not one inferred here. */
export function failedLensFlag(exhibits: readonly ExhibitPayload[]): AsofFlag | null {
  const failed = exhibits.filter(exhibitFailed).map((e) => e.lens)
  if (failed.length === 0) return null
  return { flag: 'LENS FAILED', detail: failed.join(' · '), tone: 'warning' }
}

/** How many sessions behind a view is, from what a service passed in; 0 when it passed nothing. */
export function asofHolding(asof: string | null, expected?: string | null, sessions?: number | null): number {
  if (!asof) return 0
  if (sessions != null && sessions > 0) return sessions
  return expected && expected !== asof ? 1 : 0
}
