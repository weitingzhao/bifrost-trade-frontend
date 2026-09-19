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
