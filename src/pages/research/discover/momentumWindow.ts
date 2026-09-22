/**
 * What window the radar is actually showing.
 *
 * `GET /research/momentum/radar` returns the top scores over its whole
 * history, sorted by score — not one row per symbol on the latest session.
 * Measured on DEV 2026-09-22: 100 rows spanning 2026-07-02 to 2026-09-21,
 * only 13 of them from the newest day, and 24 symbols appearing more than
 * once (PLTR at 85 on 04AUG and 81 on 07AUG). A grid of grades with no date
 * on it reads as today's opinion about every name in it.
 */
import { fmtIsoDateToken } from '@/lib/format'

export interface DatedScore {
  symbol: string
  trade_date: string
}

export function momentumWindow(rows: readonly DatedScore[]): string {
  if (rows.length === 0) return 'no scores in view'
  const dates = rows.map((r) => r.trade_date).filter(Boolean).sort()
  const newest = dates[dates.length - 1]
  const oldest = dates[0]
  const onNewest = rows.filter((r) => r.trade_date === newest).length
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const r of rows) {
    if (seen.has(r.symbol)) repeated.add(r.symbol)
    seen.add(r.symbol)
  }
  const span =
    oldest === newest
      ? `all from ${fmtIsoDateToken(newest)}`
      : `${fmtIsoDateToken(oldest)} to ${fmtIsoDateToken(newest)}, ${onNewest} from the newest session`
  const dup =
    repeated.size > 0
      ? ` · ${repeated.size} ${repeated.size === 1 ? 'name appears' : 'names appear'} more than once, on different days`
      : ''
  return `Top ${rows.length} scores across the radar's history — ${span}${dup}. Each card carries the session it was scored on.`
}
