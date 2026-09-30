/**
 * Leaders — the momentum radar's ranking, folded by name.
 *
 * The design added this View in Package 2026-09-23.5 as the answer to this
 * side's own ask: Momentum Radar is a **ranking across sessions** and nothing
 * in Stock ratings could hold that. The factors panel reads one name's nine
 * values; this reads who has been strongest over the window.
 *
 * ## Why folding by name is the whole idea
 *
 * `GET /research/momentum/radar?limit=200` returns the top N **symbol ×
 * session** rows by score, not one row per symbol. Measured on DEV
 * 2026-09-23: 200 rows, 102 distinct names, 33 distinct sessions from
 * 2026-07-02 to 2026-09-22, and **55 names appear more than once**. The flat
 * list therefore reads as a leaderboard that keeps repeating itself.
 *
 * Folded, each repeat becomes information: `hits` is how many sessions a name
 * reached the list at all, which is persistence and is sortable — the design
 * rates the move **stronger** than the page it came from for exactly that.
 *
 * ## The window is not "today"
 *
 * The newest session in that payload carried **9 names**. A page that headed
 * this "today's leaders" would be wrong about 200 of its 200 rows, so the
 * header states the window and the latest session separately.
 */
import type { MomentumScore } from '@/api/researchEngine'

export interface LeaderSession {
  /** ISO date of a trading session inside the window. */
  date: string
  /** The score this name reached that session, or null when it did not. */
  score: number | null
}

export interface LeaderRow {
  symbol: string
  /** Best score inside the window, and the session it happened on. */
  peak: number
  peakOn: string
  /** Sessions this name reached the list at all — persistence, sortable. */
  hits: number
  /** Most recent session with a row, and the score on it. */
  lastHit: string
  lastScore: number
  /** The whole window, one entry per session, in date order. */
  cells: LeaderSession[]
  /** The row behind `lastHit`, so the factors panel can read that session. */
  lastRow: MomentumScore
  /** Every session's row, keyed by date — a cell click reads its own. */
  byDate: ReadonlyMap<string, MomentumScore>
}

export interface LeaderWindow {
  /** Every session that appears anywhere in the payload, in date order. */
  sessions: readonly string[]
  rows: readonly LeaderRow[]
  /** Rows before folding — the payload's own length. */
  sourceRows: number
  /** Names on the newest session. Usually a handful; see the module doc. */
  latestNames: number
  /** Score range across the window, for the session bar's opacity. */
  min: number
  max: number
}

function isScored(r: MomentumScore): boolean {
  return typeof r.score === 'number' && Number.isFinite(r.score) && !!r.trade_date
}

/**
 * Fold `symbol × session` rows into one row per name.
 *
 * The session axis is taken from the payload rather than from a calendar:
 * a day nobody reached the list is still a session the window covers, and the
 * bar draws it grey — but a day the engine never scored at all is not a gap
 * in the ranking, it is a day outside it, and inventing cells for it would
 * make the bar claim a coverage the data does not have.
 */
export function foldLeaders(raw: readonly MomentumScore[] | undefined): LeaderWindow {
  const rows = (raw ?? []).filter(isScored)
  const sessions = [...new Set(rows.map((r) => r.trade_date))].sort()
  const byName = new Map<string, MomentumScore[]>()
  for (const r of rows) {
    const sym = r.symbol.trim().toUpperCase()
    const list = byName.get(sym)
    if (list) list.push(r)
    else byName.set(sym, [r])
  }

  const folded: LeaderRow[] = []
  for (const [symbol, list] of byName) {
    const byDate = new Map(list.map((r) => [r.trade_date, r]))
    let peakRow = list[0]
    let lastRow = list[0]
    for (const r of list) {
      if (r.score > peakRow.score) peakRow = r
      if (r.trade_date > lastRow.trade_date) lastRow = r
    }
    folded.push({
      symbol,
      peak: peakRow.score,
      peakOn: peakRow.trade_date,
      hits: byDate.size,
      lastHit: lastRow.trade_date,
      lastScore: lastRow.score,
      lastRow,
      byDate,
      cells: sessions.map((date) => ({ date, score: byDate.get(date)?.score ?? null })),
    })
  }

  const scores = rows.map((r) => r.score)
  const latest = sessions[sessions.length - 1]
  return {
    sessions,
    rows: folded,
    sourceRows: rows.length,
    latestNames: latest ? folded.filter((f) => f.byDate.has(latest)).length : 0,
    min: scores.length ? Math.min(...scores) : 0,
    max: scores.length ? Math.max(...scores) : 0,
  }
}

export type LeaderSortKey = 'peak' | 'hits' | 'last'

/** All three descending — the design gives no ascending state. */
export function sortLeaders(
  rows: readonly LeaderRow[],
  key: LeaderSortKey,
): readonly LeaderRow[] {
  const by = [...rows]
  if (key === 'hits') {
    // A tie on persistence is broken by the better peak, so the order is
    // total rather than whatever the fold happened to produce.
    by.sort((a, b) => b.hits - a.hits || b.peak - a.peak)
  } else if (key === 'last') {
    by.sort((a, b) => (a.lastHit < b.lastHit ? 1 : a.lastHit > b.lastHit ? -1 : b.peak - a.peak))
  } else {
    by.sort((a, b) => b.peak - a.peak)
  }
  return by
}

/**
 * How solidly a cell is drawn — the design's linear ramp from .3 to 1.
 *
 * Over the window's own range, not a fixed one: the radar only ever returns
 * its top N, so the scores are a narrow band near the top (72.6–86.1 on DEV)
 * and a 0–100 ramp would draw every cell at roughly the same weight.
 */
export function cellOpacity(score: number, min: number, max: number): number {
  if (!Number.isFinite(score)) return 0
  if (!(max > min)) return 1
  const t = (score - min) / (max - min)
  return Math.round((0.3 + Math.max(0, Math.min(1, t)) * 0.7) * 100) / 100
}
