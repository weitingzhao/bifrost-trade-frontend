/**
 * Ordering alerts by how much they matter, not by when they arrived.
 *
 * `/research/alerts` returns rows newest-first, and the bell rendered
 * `items.slice(0, 3)` under the name `top3`. Nothing sorted them, so "top"
 * meant "most recent": a `high` two days old sat behind three fresh `warn`s
 * and never reached the popover at all. The badge had the same blind spot from
 * the other direction — a fixed amber pill showing a count, so severity never
 * survived the closed state.
 *
 * Extracted here because this is the part that was wrong and it needs a test,
 * not because it is shared yet — the bell is its only consumer today.
 */

/** Anything the API sends that is not one of these sorts last. */
export type AlertSeverityLevel = 'high' | 'warn' | 'info'

const SEVERITY_ORDER: Record<AlertSeverityLevel, number> = { high: 0, warn: 1, info: 2 }
const UNKNOWN_ORDER = 3

export function severityRank(severity: string | null | undefined): number {
  const key = (severity ?? '').toLowerCase()
  return key in SEVERITY_ORDER ? SEVERITY_ORDER[key as AlertSeverityLevel] : UNKNOWN_ORDER
}

export interface RankableAlert {
  severity: string
  trade_date: string
}

/**
 * Severity first, then newest within a severity. Stable for rows that tie on
 * both, so the API's own order survives where this has nothing to say.
 */
export function rankAlerts<T extends RankableAlert>(items: readonly T[]): T[] {
  return [...items]
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const s = severityRank(a.item.severity) - severityRank(b.item.severity)
      if (s !== 0) return s
      const d = b.item.trade_date.localeCompare(a.item.trade_date)
      if (d !== 0) return d
      return a.i - b.i
    })
    .map((x) => x.item)
}

/** The one the badge has to speak for. Null when there is nothing to report. */
export function worstSeverity(items: readonly RankableAlert[]): string | null {
  let worst: string | null = null
  let best = UNKNOWN_ORDER + 1
  for (const it of items) {
    const r = severityRank(it.severity)
    if (r < best) {
      best = r
      worst = it.severity
    }
  }
  return worst
}

/** Text tone for a severity label. */
export function severityTextClass(severity: string | null | undefined): string {
  switch (severityRank(severity)) {
    case 0:
      return 'text-destructive'
    case 1:
      return 'text-warning'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Fill for the count badge. Semantic tokens rather than the raw `bg-amber-500`
 * this replaces, so the badge moves with the theme like everything else.
 */
export function severityBadgeClass(severity: string | null | undefined): string {
  switch (severityRank(severity)) {
    case 0:
      return 'bg-destructive text-white'
    case 1:
      return 'bg-warning text-black'
    default:
      return 'bg-muted-foreground text-white'
  }
}

/* ── What the bell is entitled to say ──────────────────────────────────── */

/**
 * An alert surface that goes quiet when its own fetch fails is worse than no
 * alert surface: the bell dropped its badge and the popover read "No analyze
 * alerts", which is exactly what it says when everything is genuinely fine.
 * Silence has to be told apart from all-clear.
 */
export type BellState =
  /** Nothing known yet — the first fetch is still out. */
  | { kind: 'checking' }
  /** The check itself failed. We do not know whether there are alerts. */
  | { kind: 'unavailable' }
  /** Answered, and there is genuinely nothing. */
  | { kind: 'clear' }
  | { kind: 'alerts'; count: number; worst: string | null }

export function bellState(q: {
  isPending: boolean
  isError: boolean
  items: readonly RankableAlert[] | undefined
}): BellState {
  // A stale list still beats a blank one, so cached items win over the error.
  if (q.items && q.items.length > 0) {
    return { kind: 'alerts', count: q.items.length, worst: worstSeverity(q.items) }
  }
  if (q.isError) return { kind: 'unavailable' }
  if (q.isPending) return { kind: 'checking' }
  return { kind: 'clear' }
}

/** Badge fill for a bell state. `unavailable` is not a severity — it is louder than quiet and quieter than a fault. */
export function bellBadgeClass(state: BellState): string {
  if (state.kind === 'alerts') return severityBadgeClass(state.worst)
  return 'bg-lamp-gray text-white'
}
