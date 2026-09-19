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
