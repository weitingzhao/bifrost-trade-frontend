/**
 * Derivations for the Hypothesis Board — pure, so the page and the tests agree.
 *
 * The design's lanes (active · testing · parked · retired) name a lifecycle no
 * column stores: the server's states are active / validated / rejected /
 * archived, and those are the lanes drawn. The design's card cells that have
 * no store — a per-hypothesis win-loss record, a stake line, a falsifier
 * field — are not invented; the cells that do read are read.
 */
import type { Hypothesis, HypothesisStatus } from '@/api/researchHypothesis'
import { ROUTES } from '@/layout/routeTable'

export type BoardLane = HypothesisStatus | 'all'

export const BOARD_LANES: readonly BoardLane[] = [
  'all',
  'active',
  'validated',
  'rejected',
  'archived',
]

export function laneCounts(rows: readonly Hypothesis[]): Record<BoardLane, number> {
  const counts: Record<BoardLane, number> = {
    all: rows.length,
    active: 0,
    validated: 0,
    rejected: 0,
    archived: 0,
  }
  for (const row of rows) counts[row.status] += 1
  return counts
}

export function laneRows(rows: readonly Hypothesis[], lane: BoardLane): Hypothesis[] {
  if (lane === 'all') return [...rows]
  return rows.filter((r) => r.status === lane)
}

/** The design's scope cell: the first symbol, or BOOK for a book-wide thesis. */
export function scopeOf(h: Pick<Hypothesis, 'symbols'>): string {
  const sym = h.symbols[0]?.trim()
  return sym ? sym.toUpperCase() : 'BOOK'
}

/** "18d" from created_at — the design's age cell. */
export function ageOf(createdAt: string | null | undefined, nowIso: string): string | null {
  if (!createdAt) return null
  const then = Date.parse(createdAt)
  const now = Date.parse(nowIso)
  if (!Number.isFinite(then) || !Number.isFinite(now)) return null
  const days = Math.max(0, Math.floor((now - then) / 86_400_000))
  return `${days}d`
}

/**
 * The design's destination link: the page the hypothesis was born on.
 * `origin_page` is a free token written by each Save-as-Hypothesis site, so
 * only the tokens that name a live page get a link; the rest answer null and
 * the card falls back to the backtest builder, which is always real.
 */
const ORIGIN_DEST: Record<string, { label: string; to: string }> = {
  'analyze-scan': { label: 'Scan', to: '/research/scan' },
  'analyze-signal-decay': { label: 'Decay', to: '/research/signal-decay' },
  candidate_batch_approve: { label: 'Pool', to: '/research/loop/candidates' },
  cockpit_inbox: { label: 'Inbox', to: '/research/loop/decisions' },
  'contract-greeks': { label: 'Greeks', to: '/research/greeks' },
  'daily-brief': { label: 'Daily Brief', to: '/research/daily-brief' },
  discovery: { label: 'Symbol', to: '/research/symbol' },
  'event-radar': { label: 'Alerts', to: '/research/event-radar' },
  greeks: { label: 'Greeks', to: '/research/greeks' },
  'market-live': { label: 'Live', to: '/market/live' },
  'momentum-radar': { label: 'Leaders', to: '/research/ratings/stocks?view=leaders' },
  positions: { label: 'Positions', to: '/portfolio/positions' },
  'research-copilot-desk': { label: 'Desk', to: '/research/copilot' },
  'research-home': { label: 'Research', to: '/research' },
  'research-workbench': { label: 'Workbench', to: '/research/workbench' },
  'sepa-daily-core': { label: 'Ratings', to: '/research/ratings/stocks' },
  sepa: { label: 'Ratings', to: '/research/ratings/stocks' },
  'trade-rules': { label: 'Rules', to: '/trade/rules' },
  watchlist: { label: 'Watchlist', to: '/research/watchlist' },
}

export function originDest(
  originPage: string | null | undefined,
): { label: string; to: string } | null {
  if (!originPage) return null
  // A stamp that is already an address needs no table. The discovery list
  // stamps the route of the station that produced the hit (2026-09-21), so
  // the Pipeline census can join on it; here it means the card links to the
  // page a reader would expect without a token having to be invented for it.
  if (originPage.startsWith('/')) {
    const known = ROUTES.find((r) => r.path === originPage)
    return known ? { label: known.label, to: known.path } : null
  }
  return ORIGIN_DEST[originPage] ?? null
}

/**
 * The objective scope, on a board whose rows were not born carrying one.
 *
 * The design scopes this page by provenance (Vision §16.3): a hypothesis keeps
 * the objective whose run opened it, and one you wrote by hand has no origin
 * machine, so a scope hides it — *that is the answer, not a gap*. The design
 * registry lists `/research/loop/hypotheses` among the wired pages, and the
 * Lens tells the reader the scope is read here.
 *
 * **It was not read here at all.** The board showed every row under any
 * scope, which is the worst of the three states: the shell says a filter is
 * on and the page quietly ignores it.
 *
 * Measured on DEV 2026-09-20 before wiring it, 53 hypotheses:
 *
 *   34  no `run_id` at all — 9 from the Copilot queue, 8 written by hand on
 *       Research home, 17 from candidate approvals. These are the design's
 *       "opened by hand", and a scope legitimately hides them.
 *   19  carry a `run_id`, across **3 distinct runs** — and not one of those
 *       runs exists any more. `/research/objective-runs` returns 29 runs and
 *       none of them matches; asked directly, the API says `run not found`.
 *
 * That reading had only looked down one road. Re-measured 2026-09-21: a
 * hypothesis born from a candidate carries `origin_ref.candidate_id`, and the
 * candidate carries `source_ref.objective_id` — which is exactly how the
 * Candidate Pool scopes itself. Through that second hop **9 of the 53 resolve**,
 * all to `obj-daily-loop-stock`, where the run path resolves none. A link is
 * dead only when every path to it is, and this one was not.
 *
 * So the scope **filters** when anything is attributable, and falls back to
 * reporting when nothing is: emptying the board because the runs that wrote
 * it were deleted would be a statement about the record rather than about the
 * machine, and that is the one case where hiding every row answers nothing.
 */
export interface ScopeReading {
  /** Rows that resolve to the scoped objective, by either path. */
  attributable: number
  /** Rows that carried no provenance at all — the design's "opened by hand". */
  byHand: number
  /** Rows carrying a run or candidate id that no longer resolves. */
  danglingRun: number
  /** Rows that resolve to a *different* objective. */
  otherObjective: number
  total: number
}

/**
 * The objective a hypothesis belongs to, by whichever path answers.
 *
 * Two roads, tried in the order they are reliable: the run that opened it,
 * then the candidate it was promoted from — the candidate carries the
 * objective that proposed it, which is the same field the Candidate Pool
 * scopes on. `null` means no path answered; `undefined` means it carried no
 * provenance to follow, which is a different thing and the banner says so.
 */
export function hypothesisObjectiveId(
  row: Pick<Hypothesis, 'origin_ref'>,
  runToObjective: ReadonlyMap<string, string>,
  candidateToObjective: ReadonlyMap<string, string>,
): string | null | undefined {
  const ref = (row.origin_ref ?? {}) as Record<string, unknown>
  const runId = typeof ref.run_id === 'string' && ref.run_id ? ref.run_id : null
  const candId = typeof ref.candidate_id === 'string' && ref.candidate_id ? ref.candidate_id : null
  if (runId == null && candId == null) return undefined
  if (runId != null) {
    const viaRun = runToObjective.get(runId)
    if (viaRun != null) return viaRun
  }
  if (candId != null) {
    const viaCandidate = candidateToObjective.get(candId)
    if (viaCandidate != null) return viaCandidate
  }
  return null
}

export function objectiveScopeReading(
  rows: readonly Hypothesis[],
  runToObjective: ReadonlyMap<string, string>,
  candidateToObjective: ReadonlyMap<string, string>,
  objectiveId: string,
): ScopeReading {
  let attributable = 0
  let byHand = 0
  let danglingRun = 0
  let otherObjective = 0
  for (const r of rows) {
    const obj = hypothesisObjectiveId(r, runToObjective, candidateToObjective)
    if (obj === undefined) byHand += 1
    else if (obj === null) danglingRun += 1
    else if (obj === objectiveId) attributable += 1
    else otherObjective += 1
  }
  return { attributable, byHand, danglingRun, otherObjective, total: rows.length }
}
