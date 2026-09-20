/**
 * The Book, counted: where an idea is standing, and what is holding it.
 *
 * Design §5a.4 — `/research/book` answers the one question its four children
 * cannot. Each of them draws its own table; none of them can say that a name
 * has been on the watchlist for months with no live reason behind it, or that
 * a belief has never had a settled trade under it. Those readings only exist
 * across the tables, which is what makes them the layer page's own.
 *
 * Nothing here creates: hypotheses and candidates are born beside evidence,
 * on Symbol, Compare and Review. This file only counts and judges.
 */
import type { WatchlistItem } from '@/types/market'
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis } from '@/api/researchHypothesis'

/** Stock rows only: an option line on the watchlist is a contract, not a name. */
export function watchlistNames(items: readonly WatchlistItem[]): string[] {
  const seen = new Set<string>()
  for (const i of items) {
    if ((i.sec_type ?? '').toUpperCase() !== 'STK') continue
    const s = (i.symbol ?? '').trim().toUpperCase()
    if (s) seen.add(s)
  }
  return [...seen].sort()
}

/** Every symbol some hypothesis is about — the live reasons on the board. */
export function thesisNames(hypotheses: readonly Hypothesis[]): Set<string> {
  const out = new Set<string>()
  for (const h of hypotheses) {
    for (const s of h.symbols ?? []) {
      const v = String(s).trim().toUpperCase()
      if (v) out.add(v)
    }
  }
  return out
}

/** The store's lanes. See the note in `census` on why these are not the design's. */
const HYPOTHESIS_LANES = ['active', 'validated', 'rejected', 'archived'] as const

export interface CensusBand {
  label: string
  n: number
  /** Null when the split cannot be read, which is different from a split of zeroes. */
  parts: { label: string; n: number }[] | null
  to: string
  /** What is missing, when `parts` is null. */
  missing?: string
}

/**
 * The four states, widest first — the shape of the funnel is the reading.
 *
 * Journal has no store on this side, so its band says that rather than
 * showing a zero: a zero is a count, and "nothing counts this" is not.
 */
export function census(
  watch: readonly WatchlistItem[],
  hypotheses: readonly Hypothesis[],
  candidates: readonly ResearchCandidate[],
): CensusBand[] {
  const names = watchlistNames(watch)
  const withThesis = thesisNames(hypotheses)
  const onWatch = names.filter((s) => withThesis.has(s)).length

  const bySource = new Map<string, number>()
  for (const c of candidates) {
    if (c.status !== 'open') continue
    const key = c.source === 'harness' ? 'curator' : c.source === 'copilot' ? 'you' : 'screen'
    bySource.set(key, (bySource.get(key) ?? 0) + 1)
  }

  const byStatus = new Map<string, number>()
  for (const h of hypotheses) byStatus.set(h.status, (byStatus.get(h.status) ?? 0) + 1)

  return [
    {
      label: 'Watchlist',
      n: names.length,
      parts: [
        { label: 'with a thesis', n: onWatch },
        { label: 'no thesis', n: names.length - onWatch },
      ],
      to: '/research/watchlist',
    },
    {
      label: 'Candidates',
      n: candidates.filter((c) => c.status === 'open').length,
      parts: ['you', 'curator', 'screen'].map((k) => ({ label: k, n: bySource.get(k) ?? 0 })),
      to: '/research/loop/candidates',
    },
    {
      label: 'Hypotheses',
      n: hypotheses.length,
      // The store's own four, not the design's. The design's lanes are
      // active / testing / parked / retired; this side settles a belief into
      // validated or rejected and archives it, which is a different sentence
      // about the same object. Printing the design's words over these counts
      // would make `parked` mean `archived`, and those are opposite claims —
      // one is set aside, the other is finished with.
      parts: HYPOTHESIS_LANES.map((k) => ({ label: k, n: byStatus.get(k) ?? 0 })),
      to: '/research/loop/hypotheses',
    },
    {
      label: 'Journal',
      n: 0,
      parts: null,
      missing: 'no artifact store on this side — the lineage tree has nothing to count yet',
      to: '/research/loop/hypotheses',
    },
  ]
}

export type StuckKind = 'no thesis' | 'aging in pool' | 'thin record'

/**
 * When one kind is most of the list, it is a cause rather than a queue.
 *
 * Twenty-nine rows saying the same sentence is not twenty-nine problems; it
 * is one, seen twenty-nine times. The rows stay — each is a real object you
 * can open — but the panel says so first, or the reader scrolls a wall
 * looking for the thing that is actually theirs to answer.
 */
export function dominantCause(stuck: readonly Stuck[]): { kind: StuckKind; n: number } | null {
  if (stuck.length < 5) return null
  const by = new Map<StuckKind, number>()
  for (const s of stuck) by.set(s.kind, (by.get(s.kind) ?? 0) + 1)
  const [kind, n] = [...by.entries()].sort((a, b) => b[1] - a[1])[0]
  return n / stuck.length >= 0.5 ? { kind, n } : null
}

export interface Stuck {
  key: string
  kind: StuckKind
  subject: string
  /** Why this is stuck, in the words the reader would use. */
  why: string
  /** Days it has been in this state; drives the order. */
  ageDays: number | null
  to: string
}

function daysSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return Math.floor((now - t) / 86_400_000)
}

/**
 * What is waiting on you, across the three tables.
 *
 * Each judgment is a cross-table one — that is the whole reason this belongs
 * to the layer page rather than to any of its children:
 *
 * - **no thesis**: a name on the watchlist that no hypothesis is about.
 *   Every page that reads the watchlist inherits it, so a name with no live
 *   reason quietly widens every list downstream.
 * - **aging in pool**: an open candidate at or past its expiry. A candidate
 *   left alone is not neutral — the market has moved on while it sat.
 * - **thin record**: a hypothesis with no settled position behind it. A
 *   belief with nothing settled cannot size anything, however old it is.
 *
 * Oldest first, because age is what makes any of these worth a look.
 */
export function waitingOnYou(
  watch: readonly WatchlistItem[],
  hypotheses: readonly Hypothesis[],
  candidates: readonly ResearchCandidate[],
  now: number,
): Stuck[] {
  const withThesis = thesisNames(hypotheses)
  const out: Stuck[] = []

  const firstSeen = new Map<string, number>()
  for (const i of watch) {
    if ((i.sec_type ?? '').toUpperCase() !== 'STK') continue
    const s = (i.symbol ?? '').trim().toUpperCase()
    if (!s) continue
    const at = Number(i.created_at ?? 0) * 1000
    if (!firstSeen.has(s) || at < (firstSeen.get(s) as number)) firstSeen.set(s, at)
  }
  for (const [symbol, at] of firstSeen) {
    if (withThesis.has(symbol)) continue
    out.push({
      key: `thesis:${symbol}`,
      kind: 'no thesis',
      subject: symbol,
      why: 'On the watchlist with no hypothesis about it — every page that reads the list carries it anyway.',
      ageDays: at > 0 ? Math.floor((now - at) / 86_400_000) : null,
      to: '/research/watchlist',
    })
  }

  for (const c of candidates) {
    if (c.status !== 'open') continue
    const left = daysSince(c.ttl_at, now)
    // `daysSince` counts forward from the stamp, so a future expiry is
    // negative — at or past zero is the row that needs answering.
    if (left == null || left < 0) continue
    out.push({
      key: `pool:${c.id}`,
      kind: 'aging in pool',
      subject: c.symbol,
      why: `Open in the pool past its expiry. A candidate left alone is not neutral — the market moved while it sat.`,
      ageDays: daysSince(c.created_at, now),
      to: '/research/loop/candidates',
    })
  }

  for (const h of hypotheses) {
    // A settled belief is not stuck: validated, rejected and archived have
    // each had their answer. Only a live one with nothing behind it is.
    if (h.status !== 'active') continue
    if ((h.linked_opportunity_ids ?? []).length > 0) continue
    out.push({
      key: `thin:${h.id}`,
      kind: 'thin record',
      subject: h.title,
      why: 'No settled position is linked to it, so it has no record to size against — however long it has been open.',
      ageDays: daysSince(h.created_at, now),
      to: '/research/loop/hypotheses',
    })
  }

  return out.sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1))
}
