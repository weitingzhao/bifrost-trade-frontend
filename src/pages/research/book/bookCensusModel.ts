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

export type BandTagVariant = 'success' | 'info' | 'danger' | 'neutral' | 'category'

export interface CensusBand {
  label: string
  n: number
  /** What this state *is*, in a reader's words — the design's own sentence. */
  what: string
  /** The band's own colour, so the four counts read as a sequence. */
  ink: string
  /** Null when the split cannot be read, which is different from a split of zeroes. */
  parts: { label: string; n: number; variant: BandTagVariant }[] | null
  /** Null when there is no page for this state yet. */
  to: string | null
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

  const noThesis = names.length - onWatch
  return [
    {
      label: 'Watchlist',
      n: names.length,
      what: 'Names with a thesis attached — the widest end of the book.',
      ink: 'text-sky-300',
      parts: [
        { label: `${onWatch} with thesis`, n: onWatch, variant: 'info' },
        { label: `${noThesis} without`, n: noThesis, variant: noThesis > 0 ? 'danger' : 'neutral' },
      ],
      to: '/research/watchlist',
    },
    {
      label: 'Candidates',
      n: candidates.filter((c) => c.status === 'open').length,
      what: 'What the loop is considering. The Curator screens in, expiry screens out, you promote.',
      ink: 'text-violet-300',
      parts: ['you', 'curator', 'screen'].map((k) => ({
        label: `${k} ${bySource.get(k) ?? 0}`,
        n: bySource.get(k) ?? 0,
        variant: (k === 'you' ? 'success' : k === 'curator' ? 'category' : 'info') as BandTagVariant,
      })),
      to: '/research/loop/candidates',
    },
    {
      label: 'Hypotheses',
      n: hypotheses.length,
      what: 'Tradable beliefs, each with its evidence and its settled record.',
      ink: 'text-lime-300',
      // The store's own four, not the design's. The design's lanes are
      // active / testing / parked / retired; this side settles a belief into
      // validated or rejected and archives it, which is a different sentence
      // about the same object. Printing the design's words over these counts
      // would make `parked` mean `archived`, and those are opposite claims —
      // one is set aside, the other is finished with.
      parts: HYPOTHESIS_LANES.map((k) => ({
        label: `${k} ${byStatus.get(k) ?? 0}`,
        n: byStatus.get(k) ?? 0,
        variant: (k === 'active' ? 'success' : k === 'validated' ? 'info' : 'neutral') as BandTagVariant,
      })),
      to: '/research/loop/hypotheses',
    },
    {
      label: 'Journal',
      n: 0,
      what: 'History. Append-only — every artifact, its branches, and what it settled to.',
      ink: 'text-foreground',
      parts: null,
      missing: 'no artifact store on this side — the lineage tree has nothing to count yet',
      // No page either: linking this band to the Hypothesis Board would answer
      // a click about history with a list of beliefs.
      to: null,
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
  /** Which of the three tables the row lives in. */
  where: 'Watchlist' | 'Candidate' | 'Hypothesis'
  /** The symbol it is about, or BOOK for a belief about the whole book. */
  scope: string
  /**
   * The ticker behind `scope`, or null when there is not one.
   *
   * Kept apart from the label so the cell does not have to decide by matching
   * the string 'BOOK': a belief about the whole book has no symbol page to
   * open, and that is a fact about the row, not about how it is spelled.
   */
  symbol: string | null
  /** What is waiting, in one line. */
  what: string
  /** Why this is stuck, in the words the reader would use. Carried as the tip. */
  why: string
  /** Days it has been in this state; drives the order. */
  ageDays: number | null
  to: string
}

/**
 * How loudly an age reads. The design's thresholds, and its reasoning: under
 * four days nothing has gone wrong yet, over eight it has been ignored.
 */
export function stuckAgeTone(days: number | null): 'old' | 'aging' | 'plain' {
  if (days == null) return 'plain'
  if (days >= 8) return 'old'
  return days >= 4 ? 'aging' : 'plain'
}

/** The first real ticker a belief names, or null when it is about the book. */
function hypothesisSymbol(h: Hypothesis): string | null {
  return (h.symbols ?? []).map((x) => String(x).trim().toUpperCase()).find(Boolean) ?? null
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
      where: 'Watchlist',
      scope: symbol,
      symbol,
      what: 'watched with no thesis written',
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
    const who = c.source === 'harness' ? 'curator' : c.source === 'copilot' ? 'you' : 'screen'
    out.push({
      key: `pool:${c.id}`,
      kind: 'aging in pool',
      where: 'Candidate',
      scope: c.symbol,
      symbol: c.symbol.trim().toUpperCase() || null,
      // The design prints the vehicle here; no column stores one on this side,
      // so the row says who nominated it and what the loop scored it, which
      // is what the pool actually holds.
      what: `${who} nomination${c.score == null ? '' : ` · score ${c.score.toFixed(2)}`}`,
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
      where: 'Hypothesis',
      // A belief about no particular name is about the book, which the design
      // writes as BOOK rather than leaving the cell empty.
      scope: hypothesisSymbol(h) ?? 'BOOK',
      symbol: hypothesisSymbol(h),
      what: h.title,
      why: 'No settled position is linked to it, so it has no record to size against — however long it has been open.',
      ageDays: daysSince(h.created_at, now),
      to: '/research/loop/hypotheses',
    })
  }

  return out.sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1))
}

export interface BookView {
  name: string
  what: string
  /** The count this view holds, printed beside it. Null when nothing counts it. */
  meta: string
  to: string | null
}

/**
 * The four views, each with the size of what it holds.
 *
 * The count belongs beside the name for the same reason the census exists: a
 * list of four page names says where to click, and says nothing about which
 * of them is worth clicking today.
 */
export function bookViews(bands: readonly CensusBand[]): BookView[] {
  const n = (label: string) => bands.find((b) => b.label === label)?.n ?? 0
  return [
    {
      name: 'Hypothesis Board',
      what: 'Every tradable belief, with its evidence and its record. Born next to evidence, never typed in.',
      meta: `${n('Hypotheses')} beliefs`,
      to: '/research/loop/hypotheses',
    },
    {
      name: 'Candidate Pool',
      what: 'What the loop is considering right now, with who nominated it and what it scored at ingest.',
      meta: `${n('Candidates')} open`,
      to: '/research/loop/candidates',
    },
    {
      name: 'Watchlist',
      what: 'Names with a thesis attached — pinned from the screen, from Symbol or from an Inspector.',
      meta: `${n('Watchlist')} names`,
      to: '/research/watchlist',
    },
    {
      name: 'Journal',
      what: 'The history layer: every artifact, whoever wrote it, with its branches and what it settled to.',
      meta: 'no page yet',
      to: null,
    },
  ]
}
