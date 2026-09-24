/**
 * Research Overview — the computations behind the page.
 *
 * The page states three operators, one dial and one book from queries the
 * app already answers; everything here is a pure function so the honest
 * cells (and the deliberately grey ones) are pinned by tests.
 */
import type { ResearchCandidate } from '@/api/research/candidates'
import type { Hypothesis } from '@/api/researchHypothesis'
import { operatorOf, sourceOperatorOf, type ResearchOperator } from '@/lib/research/operatorOf'
import type { ObjectiveLeash } from '@/pages/research/loop/leash'

// ── The dial (Vision §8) ─────────────────────────────────────────────────

export interface DialLevelDef {
  level: 'L0' | 'L1' | 'L2' | 'L3'
  name: string
  passes: string
  waits: string
}

/** The four levels, worded as the design registry words them. */
export const DIAL_LEVELS: DialLevelDef[] = [
  { level: 'L0', name: 'all by hand', passes: 'nothing', waits: 'everything' },
  {
    level: 'L1',
    name: 'research drafts',
    passes: 'hypotheses that clear the leash · candidates into the pool',
    waits: 'policy patches · rules · anything that is not a draft',
  },
  {
    level: 'L2',
    name: 'bounded patches',
    passes: 'L1 + patches inside preset bounds (floor ±0.05 · cap ±2)',
    waits: 'out-of-bounds patches · new objectives · judge changes',
  },
  {
    level: 'L3',
    name: 'research autonomous',
    passes: 'L2 + out-of-bounds patches with ≥ n settled attributions',
    waits: 'new objectives · judge changes · orders — always',
  },
]

/** The design's L2 gate: ≥ 30 settled under L1, per objective. */
export const L2_NEED = 30

/**
 * The level the system is actually at. There is no stored dial yet (that
 * lands with its table in W4): what exists is the trust grant, and the leash
 * behind it accepts research drafts and nothing else — which is exactly L1's
 * definition. Armed = L1, not armed = L0; L2 and L3 have no mechanism at all.
 */
export function dialLevelFromTrust(matrixL0: boolean | null | undefined): 'L0' | 'L1' {
  return matrixL0 ? 'L1' : 'L0'
}

export interface EarnRow {
  title: string
  settled: number
  need: number
  /** Settled hit rate, 0–1, or null when nothing settled. */
  hit: number | null
  floor: number
  pct: number
}

/**
 * The "to L2" row: the objective closest to earning it — most settled
 * outcomes first. Null when no objective has any record at all.
 */
export function earnRow(rows: readonly ObjectiveLeash[]): EarnRow | null {
  const best = [...rows].sort((a, b) => (b.judged ?? 0) - (a.judged ?? 0))[0]
  if (!best || !best.judged) return null
  return {
    title: best.title,
    settled: best.judged,
    need: L2_NEED,
    hit: best.hitRate,
    floor: best.floor,
    pct: Math.min(100, (best.judged / L2_NEED) * 100),
  }
}

// ── The Book (Vision §12): state, whoever wrote it ───────────────────────

export interface BookShare {
  hand: number
  loop: number
  copilot: number
  total: number
}

export interface BookRow {
  share: BookShare
  meta: string
}

function share(ops: ResearchOperator[]): BookShare {
  const s = { hand: 0, loop: 0, copilot: 0, total: ops.length }
  for (const o of ops) s[o] += 1
  return s
}

export function hypothesesBook(rows: readonly Hypothesis[]): BookRow {
  const by = { active: 0, validated: 0, rejected: 0, archived: 0 } as Record<string, number>
  for (const h of rows) by[h.status] = (by[h.status] ?? 0) + 1
  const parts = (['active', 'validated', 'rejected', 'archived'] as const)
    .filter((k) => by[k] > 0)
    .map((k) => `${by[k]} ${k}`)
  return {
    share: share(rows.map((h) => operatorOf(h.origin_page))),
    meta: [String(rows.length), ...parts.slice(0, 2)].join(' · '),
  }
}

/** ttl inside this window reads "expiring" — the Pool page's own rule. */
const EXPIRING_MS = 2 * 86_400_000

export function candidatesBook(rows: readonly ResearchCandidate[], nowIso: string): BookRow {
  const now = Date.parse(nowIso)
  const expiring = rows.filter(
    (r) => r.ttl_at && Date.parse(r.ttl_at) - now <= EXPIRING_MS && Date.parse(r.ttl_at) > now,
  ).length
  return {
    share: share(rows.map((r) => sourceOperatorOf(r.source))),
    meta: `${rows.length} in pool${expiring > 0 ? ` · ${expiring} expire in 2d` : ''}`,
  }
}

export function watchlistBook(count: number): BookRow {
  // The market watchlist stores no author; every row was added by a person.
  return { share: { hand: count, loop: 0, copilot: 0, total: count }, meta: `${count} · all by hand` }
}

// ── Small date helpers for the Today feed ────────────────────────────────

export function isToday(iso: string | null | undefined, nowIso: string): boolean {
  if (!iso) return false
  return iso.slice(0, 10) === nowIso.slice(0, 10)
}

// ── The loop, drawn as a circuit (design Rev 2026-09-20.23) ────────────────

/**
 * A page a station writes at, and why a reader would open it.
 *
 * The prototype carries these as chips on each station card, with the tip as
 * the chip's title. `to` is the app's route: the design's chip for Vol ratings
 * points at `/research/ratings`, which neither side has — its own registry
 * calls `/research/scan` Vol ratings, and that is the page this app built.
 */
export interface LoopPage {
  label: string
  to: string
  tip: string
}

export interface LoopStation {
  /** `01`…`06` — the station's place on the loop, not an index. */
  n: string
  /** Matches `StationRow.name`, which carries the live counts. */
  name: string
  produces: string
  /** Top row runs left→right, bottom row right→left: the circuit. */
  row: 'top' | 'bottom'
  pages: LoopPage[]
  /** Set where the station's product leaves Research altogether. */
  crossNote?: string
}

/**
 * The six stations with the pages each writes at.
 *
 * Straight from the prototype's `TOP` / `BOTTOM`, in its order — the order is
 * the argument: 01→03 across the top, 06→04 back along the bottom, and the
 * return edge closing the circuit on the left. Two stations cross the outer
 * loop, which is why the sidebar spine ends in `↺ 5 → 1` rather than a stop.
 */
export const LOOP_STATIONS: readonly LoopStation[] = [
  {
    n: '01',
    name: 'Scan',
    produces: 'screen',
    row: 'top',
    pages: [
      {
        label: 'Stock ratings',
        to: '/research/ratings/stocks',
        tip: 'The equity model’s daily opinion.',
      },
      { label: 'Vol ratings', to: '/research/scan', tip: 'The vol model.' },
      {
        label: 'Stock screen',
        to: '/research/screener',
        tip: 'Conditions in, a set out — the ranked universe browse lives here too.',
      },
    ],
  },
  {
    n: '02',
    name: 'Nominate',
    produces: 'nomination',
    row: 'top',
    pages: [
      {
        label: 'Candidate Pool',
        to: '/research/loop/candidates',
        tip: 'What the loop is considering — Curator screens in, decay screens out, you promote.',
      },
      {
        label: 'Watchlist',
        to: '/research/watchlist',
        tip: 'Promoted candidates with the thesis carried over.',
      },
    ],
  },
  {
    n: '03',
    name: 'Judge',
    produces: 'verdict · memo',
    row: 'top',
    pages: [
      { label: 'Symbol', to: '/research/symbol', tip: 'One symbol, every read.' },
      {
        label: 'Compare',
        to: '/research/compare',
        tip: 'Side-by-side. Assembly, not estimation — owes no Method face, but three of its inputs are not on the data plan yet.',
      },
      { label: 'History', to: '/research/history', tip: 'Where IV sits.' },
      {
        label: 'Personas',
        to: '/research/agent-personas',
        tip: 'Who judges, and their settled record.',
      },
    ],
  },
  {
    n: '06',
    name: 'Feed back',
    produces: 'patch',
    row: 'bottom',
    crossNote: 'a verdict is a judgment in Review',
    pages: [
      {
        label: 'Review · Objectives',
        to: '/review/objectives',
        tip: 'The closing page: did the machine earn its keep. Patches are drafted from its verdicts.',
      },
      {
        label: 'Decision Inbox',
        to: '/research/loop/decisions',
        tip: 'Every patch waits here, whoever drafted it.',
      },
    ],
  },
  {
    n: '05',
    name: 'Settle',
    produces: 'settlement',
    row: 'bottom',
    crossNote: 'a settlement is money in Portfolio',
    pages: [
      { label: 'Outcome', to: '/portfolio/outcome', tip: 'Settled money, attributed.' },
      { label: 'Positions', to: '/portfolio/positions', tip: 'What is still open.' },
    ],
  },
  {
    n: '04',
    name: 'Decide',
    produces: 'decision → hypothesis',
    row: 'bottom',
    pages: [
      {
        label: 'Decision Inbox',
        to: '/research/loop/decisions',
        tip: 'Accept opens a hypothesis — never an order (D10).',
      },
      {
        label: 'Hypothesis Board',
        to: '/research/loop/hypotheses',
        tip: 'What I currently believe, and its record.',
      },
      { label: 'Backtest', to: '/research/backtest', tip: 'Validate before you believe.' },
    ],
  },
]

export interface LoopCard extends LoopStation {
  /** `h · l · c` — today's artifacts by operator, as the card prints them. */
  counts: string
  countsTip: string
}

/**
 * The circuit's cards: the design's stations carrying the page's live counts.
 *
 * The counts are not recomputed here — `StationsTable`'s rows already carry
 * them, one definition for both readings (§14.2). A station the app does not
 * count keeps its card and prints dashes, because a station missing from the
 * loop would say the loop has five.
 */
export function loopCards(
  counts: readonly { name: string; h: string; l: string; c: string }[],
): LoopCard[] {
  return LOOP_STATIONS.map((st) => {
    const row = counts.find((c) => c.name === st.name)
    return {
      ...st,
      counts: row ? `${row.h} · ${row.l} · ${row.c}` : '— · — · —',
      countsTip: 'today’s artifacts · hand / loop / copilot',
    }
  })
}
