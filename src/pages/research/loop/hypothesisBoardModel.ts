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
  'momentum-radar': { label: 'Momentum', to: '/research/momentum-radar' },
  positions: { label: 'Positions', to: '/portfolio/positions' },
  'research-copilot-desk': { label: 'Desk', to: '/research/copilot' },
  'research-home': { label: 'Research', to: '/research' },
  'research-workbench': { label: 'Workbench', to: '/research/workbench' },
  'sepa-daily-core': { label: 'SEPA', to: '/research/sepa-daily-core' },
  sepa: { label: 'SEPA', to: '/research/sepa-daily-core' },
  'trade-rules': { label: 'Rules', to: '/trade/rules' },
  watchlist: { label: 'Watchlist', to: '/research/watchlist' },
}

export function originDest(
  originPage: string | null | undefined,
): { label: string; to: string } | null {
  if (!originPage) return null
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
 * So nothing on this board can be attributed to an objective today, and the
 * link that would do it points at runs that have been deleted. Filtering on
 * it would empty the board for a reason that is about the record rather than
 * about the machine — so the scope is **reported and not applied**, and the
 * banner says which of the two reasons each row falls under. When the runs
 * resolve, `attributable` stops being zero and the filter can turn on.
 */
export interface ScopeReading {
  /** Rows whose run resolves to the scoped objective. */
  attributable: number
  /** Rows that never carried a run — the design's "opened by hand". */
  byHand: number
  /** Rows carrying a run id that no longer resolves to any objective. */
  danglingRun: number
  total: number
}

export function objectiveScopeReading(
  rows: readonly Hypothesis[],
  runToObjective: ReadonlyMap<string, string>,
  objectiveId: string,
): ScopeReading {
  let attributable = 0
  let byHand = 0
  let danglingRun = 0
  for (const r of rows) {
    const runId = (r.origin_ref as { run_id?: unknown } | null)?.run_id
    if (typeof runId !== 'string' || runId === '') {
      byHand += 1
      continue
    }
    const obj = runToObjective.get(runId)
    if (obj == null) danglingRun += 1
    else if (obj === objectiveId) attributable += 1
  }
  return { attributable, byHand, danglingRun, total: rows.length }
}
